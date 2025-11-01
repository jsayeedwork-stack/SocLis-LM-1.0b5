import { GoogleGenAI } from '@google/genai';
import { Document, ChatMessage } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export async function* generateResponseStream(
  messages: ChatMessage[],
  documents: Document[],
  logicSummary: string[],
  signal: AbortSignal
): AsyncGenerator<string> {
  const documentContext = documents.length > 0
    ? `--- SOURCE DOCUMENTS FOR CITATION ---\n\n${documents.map(doc => `File Name: ${doc.fileName}\nContent:\n${doc.content}`).join('\n\n---\n')}`
    : "";

  const logicContext = logicSummary.length > 0
    ? `--- YOUR LOGIC (RULES) ---\n- ${logicSummary.join('\n- ')}`
    : "";

  const systemInstruction = `You are a helpful AI assistant called Social Listening LM. Your goal is to have a flexible, ongoing conversation.

**CONTEXT:**
You have been provided with two types of information:
1.  **Source Documents:** These are static files. When you use information from these, you MUST ground your answer in them and provide a direct quote as a citation.
2.  **Your Logic (Rules):** This is a list of rules and context from previous conversations that acts as a "save state" or your core logic.

**YOUR TASK:**
Your primary goal is to continue the conversation naturally, adhering to the logic points in your memory. The user's latest message is the most current source of truth.

**RULES & RESPONSE FORMAT:**
-   **Embrace Updates:** If the user provides new information, updates, or corrections—even if it contradicts your logic or the source documents—you MUST accept it. Do not argue. Acknowledge the new information and incorporate it.
-   **Prioritize the Conversation:** The live chat is the most important context.
-   **Cite Sources, Not Logic:** Provide citations ONLY for information taken directly from the "Source Documents".
-   **Response Format:**
    1.  **Answer:** Provide the complete answer to the user's query in Markdown.
    2.  **Citations:** After the answer, if you used source documents, add a separator line: '---CITATIONS---'. Below it, provide a single, valid JSON array of citation objects. Each object must have "fileName" and "quote" keys. Do not add any text after the JSON array. If no citations are used, do not include the separator or the JSON array.

Here is your context:
${documentContext || "No source documents provided."}

${logicContext || "You have no logic (rules) defined yet."}
`;

  const contents = messages.map(msg => ({
    role: msg.role,
    parts: msg.parts.map(p => {
      if (p.inlineData) {
        return {
          inlineData: {
            mimeType: p.inlineData.mimeType,
            data: p.inlineData.data,
          }
        };
      }
      return { text: p.text || '' };
    })
  }));

  try {
    const stream = await ai.models.generateContentStream({
      model: 'gemini-2.5-pro',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    for await (const chunk of stream) {
        if (signal.aborted) {
            return; 
        }
        yield chunk.text;
    }

  } catch (error) {
    console.error("Error generating response from Gemini:", error);
    yield "Sorry, I encountered an error while processing your request. Please check the console for details.";
  }
};

export const generateLogicFromConversation = async (
  chatHistory: ChatMessage[],
  documents: Document[]
): Promise<string> => {

  const formattedHistory = chatHistory.map(msg => {
      const prefix = msg.role === 'model' ? "AI" : "User";
      // Consolidate text parts for the prompt. Images are ignored for this logic generation.
      const textContent = msg.parts.map(p => p.text || '').join(' ').trim();
      return `${prefix}: "${textContent}"`;
  }).join('\n');

  const documentContext = documents.length > 0
    ? `--- SOURCE DOCUMENTS ---\n\n${documents.map(doc => `File Name: ${doc.fileName}\nContent:\n${doc.content}`).join('\n\n---\n')}`
    : "No source documents were provided.";

  const prompt = `Analyze the following conversation history and source documents. The user's final message often contains a correction or instruction. Your task is to distill the core learning from this entire interaction into a single, concise, and generalized rule for the AI to remember. The rule must be context-independent and written as a clear instruction.

**Source Documents:**
${documentContext}

**Conversation History:**
${formattedHistory}

**Generated Rule:**`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });

    const logicPoint = response.text.trim();
    if (!logicPoint) {
      throw new Error("Failed to generate a new logic point.");
    }
    return logicPoint.replace(/^["']|["']$/g, ''); // Remove quotes that the model sometimes adds around the response
  } catch (error: any) {
    console.error("Error generating logic point from conversation:", error);
    if (error.toString().includes('429')) {
      throw new RateLimitError("You're doing that too fast! Please wait a moment before trying to save another logic point.");
    }
    throw new Error("Failed to generate a new logic point.");
  }
};