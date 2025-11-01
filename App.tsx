import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Document, LogicFile } from './types';
import FileUpload from './components/FileUpload';
import ChatInterface from './components/ChatInterface';
import LogicView from './components/LearningsView'; // Renamed component, but file name kept for simplicity
import { generateResponseStream, generateLogicFromConversation, RateLimitError } from './services/geminiService';
import Icon from './components/Icon';

type ActiveView = 'chat' | 'logic';
type ActivePanel = 'sources' | 'none';

const APP_VERSION = "2.0.0"; // Version for new simplified logic format

const App: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>(() => {
    try {
      const savedDocs = localStorage.getItem('social-listening-lm-documents');
      return savedDocs ? JSON.parse(savedDocs) : [];
    } catch (error) {
      console.error("Failed to parse documents from localStorage", error);
      return [];
    }
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const savedMessages = localStorage.getItem('social-listening-lm-messages');
      return savedMessages ? JSON.parse(savedMessages) : [];
    } catch (error) {
      console.error("Failed to parse messages from localStorage", error);
      return [];
    }
  });
  const [logic, setLogic] = useState<string[] | null>(() => {
    try {
        const savedLogic = localStorage.getItem('social-listening-lm-logic');
        if (savedLogic) {
            const parsed = JSON.parse(savedLogic) as LogicFile;
            if (parsed.logic && Array.isArray(parsed.logic)) {
                return parsed.logic;
            }
        }
        return null;
    } catch (error) {
        console.error("Failed to parse logic from localStorage", error);
        return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingLogic, setIsGeneratingLogic] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('chat');
  const [activePanel, setActivePanel] = useState<ActivePanel>('sources');
  
  const abortControllerRef = useRef<AbortController | null>(null);


  useEffect(() => {
    try {
      localStorage.setItem('social-listening-lm-documents', JSON.stringify(documents));
    } catch (error) {
      console.error("Failed to save documents to localStorage", error);
    }
  }, [documents]);

  useEffect(() => {
    try {
      localStorage.setItem('social-listening-lm-messages', JSON.stringify(messages));
    } catch (error) {
      console.error("Failed to save messages to localStorage", error);
    }
  }, [messages]);

  useEffect(() => {
    try {
        if (logic) {
            const logicFile: LogicFile = { version: APP_VERSION, logic: logic };
            localStorage.setItem('social-listening-lm-logic', JSON.stringify(logicFile));
        } else {
            localStorage.removeItem('social-listening-lm-logic');
        }
    } catch (error) {
        console.error("Failed to save logic to localStorage", error);
    }
  }, [logic]);


  const handleNewDocuments = (newDocs: Document[]) => {
    setDocuments(prevDocs => {
      const existingFileNames = new Set(prevDocs.map(doc => doc.fileName));
      const uniqueNewDocs = newDocs.filter(doc => !existingFileNames.has(doc.fileName));
      return [...prevDocs, ...uniqueNewDocs];
    });
  };

  const handleRemoveDocument = (fileName: string) => {
    setDocuments(prevDocs => prevDocs.filter(doc => doc.fileName !== fileName));
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
  };

  const handleClearLogic = () => {
    setLogic(null);
  };

  const handleUploadLogic = (content: string) => {
    try {
        const parsedContent = JSON.parse(content) as LogicFile;
        if (parsedContent.logic && Array.isArray(parsedContent.logic)) {
            setLogic(parsedContent.logic);
        } else {
            throw new Error("Invalid logic file format. Expected '{ \"logic\": [...] }'.");
        }
    } catch (error) {
        console.error("Failed to parse uploaded logic file:", error);
        alert("The uploaded file is not a valid logic file.");
    }
  };

  const handleDownloadLogic = () => {
    if (!logic || logic.length === 0) return;
    const logicFile: LogicFile = { version: APP_VERSION, logic };
    const blob = new Blob([JSON.stringify(logicFile, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `social-listening-logic-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        setIsLoading(false);
    }
  };

  const handleSaveLogic = async () => {
    if (messages.length === 0) {
        alert("Cannot create logic from an empty chat.");
        return;
    }

    setIsGeneratingLogic(true);
    try {
        const newLogicPoint = await generateLogicFromConversation(messages, documents);
        setLogic(prevLogic => [...(prevLogic || []), newLogicPoint]);
    } catch (error) {
        if (error instanceof RateLimitError) {
            alert(error.message);
        } else {
            alert("Failed to create logic from conversation.");
            console.error("Failed to save new logic:", error);
        }
    } finally {
        setIsGeneratingLogic(false);
    }
  };


  const handleSendMessage = async (userMessage: ChatMessage) => {
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    const startTime = performance.now();
    let fullResponseStream = "";

    const modelMessageId = `model-${Date.now()}`;
    const placeholderModelMessage: ChatMessage = {
        id: modelMessageId,
        role: 'model',
        parts: [],
    };
    setMessages(prev => [...prev, placeholderModelMessage]);

    try {
        const stream = generateResponseStream(newMessages, documents, logic || [], signal);

        for await (const chunk of stream) {
            if (signal.aborted) break;
            fullResponseStream += chunk;

            setMessages(prev => prev.map(msg => {
                if (msg.id !== modelMessageId) return msg;
                if (msg.parts.length === 0) {
                     return { ...msg, parts: [{ text: chunk }] };
                }
                const newParts = [...msg.parts];
                newParts[0].text = (newParts[0].text || "") + chunk;
                return { ...msg, parts: newParts };
            }));
        }
    } catch (error) {
        if (!signal.aborted) {
            console.error("Failed to get response:", error);
            const errorMessage: ChatMessage = {
                id: modelMessageId,
                role: 'model',
                parts: [{ text: "An error occurred. Please try again." }],
            };
            setMessages(prev => prev.map(msg => msg.id === modelMessageId ? errorMessage : msg));
        }
    } finally {
        setIsLoading(false);
        const endTime = performance.now();
        const generationTime = endTime - startTime;

        let finalAnswer = fullResponseStream;
        let citations = [];

        if (finalAnswer.includes('---CITATIONS---')) {
            const parts = finalAnswer.split('---CITATIONS---');
            finalAnswer = parts[0].trim();
            const citationBlock = parts[1].trim();
            
            const jsonStartIndex = citationBlock.indexOf('[');
            const jsonEndIndex = citationBlock.lastIndexOf(']');

            if (jsonStartIndex !== -1 && jsonEndIndex > jsonStartIndex) {
                const jsonString = citationBlock.substring(jsonStartIndex, jsonEndIndex + 1);
                try {
                    citations = JSON.parse(jsonString);
                } catch (e) {
                    console.error("Failed to parse JSON from citation block:", e, `| Extracted string: "${jsonString}"`);
                    finalAnswer += "\n\n(Could not parse citations)";
                }
            } else {
                 console.error("Could not find valid JSON array in citation block.", `| Citation block: "${citationBlock}"`);
                 finalAnswer += "\n\n(Could not parse citations)";
            }
        }
        
        if (signal.aborted) {
            finalAnswer += "\n\n(Generation stopped by user)";
        }

        const finalModelMessage: ChatMessage = {
            id: modelMessageId,
            role: 'model',
            parts: [{ text: finalAnswer.trim() }],
            citations,
            generationTime,
        };
        
        setMessages(prev => prev.map(msg => msg.id === modelMessageId ? finalModelMessage : msg));
    }
  };
  
  const TabButton: React.FC<{view: ActiveView, label: string, icon: any }> = ({ view, label, icon }) => (
    <button
        onClick={() => setActiveView(view)}
        className={`flex items-center gap-2.5 px-4 py-3 text-sm font-semibold rounded-md transition-all ${
            activeView === view 
            ? 'bg-brand-surface-light text-brand-text-primary' 
            : 'text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-surface'
        }`}
    >
        <Icon name={icon} className="w-4 h-4" />
        {label}
    </button>
  );

  const SidebarButton: React.FC<{panel: ActivePanel, label: string, icon: any }> = ({ panel, label, icon }) => (
    <button
        onClick={() => {
          if (activePanel === panel) {
            setIsSidebarOpen(prev => !prev);
          } else {
            setActivePanel(panel);
            setIsSidebarOpen(true);
          }
        }}
        className={`flex items-center justify-center w-12 h-12 rounded-lg transition-all transform hover:scale-105 ${
            activePanel === panel && isSidebarOpen
            ? 'bg-brand-red/10 text-brand-red' 
            : 'text-brand-text-secondary hover:bg-brand-surface hover:text-brand-text-primary'
        }`}
        aria-label={label}
        title={label}
    >
        <Icon name={icon} className="w-6 h-6" />
    </button>
  );

  return (
    <div className="flex h-screen font-sans bg-brand-background text-brand-text-primary antialiased">
        <aside className="p-3 bg-brand-surface/50 border-r border-brand-outline flex flex-col items-center gap-3 animate-slide-in">
            <div className="w-12 h-12 flex items-center justify-center">
                <Icon name="logo" className="w-8 h-8 text-brand-red" />
            </div>
            <SidebarButton panel="sources" label="Sources" icon="document" />
        </aside>

        <div className={`
          bg-brand-surface border-r border-brand-outline flex flex-col transition-all duration-300 ease-in-out overflow-hidden
          ${isSidebarOpen ? 'w-[350px]' : 'w-0'}`}>
            <div className={`p-4 h-full transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>
                <FileUpload 
                    documents={documents}
                    onNewDocuments={handleNewDocuments} 
                    onRemoveDocument={handleRemoveDocument}
                    onClose={() => setIsSidebarOpen(false)}
                />
            </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
             <header className="flex items-center justify-between p-3 border-b border-brand-outline shrink-0 animate-fade-in" style={{ animationDelay: '200ms' }}>
                <div className="flex items-center gap-2 bg-brand-surface p-1.5 rounded-lg">
                    <TabButton view="chat" label="Chat" icon="send" />
                    <TabButton view="logic" label="Logic" icon="lightbulb" />
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleClearChat}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-text-secondary hover:text-brand-red hover:bg-brand-surface rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Clear chat"
                        title="Clear chat"
                        disabled={messages.length === 0 || isLoading}
                    >
                        <Icon name="trash" className="w-4 h-4" />
                        <span className="hidden md:inline">Clear Chat</span>
                    </button>
                </div>
            </header>
            <main className="flex-1 overflow-hidden relative">
              <div className="w-full h-full animate-fade-in" key={activeView}>
                  {activeView === 'chat' ? (
                      <ChatInterface
                          messages={messages}
                          onSendMessage={handleSendMessage}
                          onStopGeneration={handleStopGeneration}
                          onDeleteMessage={handleDeleteMessage}
                          isLoading={isLoading}
                          onSaveLogic={handleSaveLogic}
                          isGeneratingLogic={isGeneratingLogic}
                      />
                  ) : (
                      <LogicView
                          logic={logic}
                          onSetLogic={setLogic}
                          onUpload={handleUploadLogic}
                          onDownload={handleDownloadLogic}
                          onClear={handleClearLogic}
                      />
                  )}
              </div>
            </main>
        </div>
    </div>
  );
};

export default App;