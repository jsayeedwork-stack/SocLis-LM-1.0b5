
export interface Document {
  fileName: string;
  content: string; // The entire text content concatenated
}

export interface Citation {
  fileName: string;
  quote: string;
}

// Represents a part of a message, can be text or image
export interface MessagePart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64 encoded
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  parts: MessagePart[];
  citations?: Citation[];
  generationTime?: number; // Time in milliseconds for model response
}

// Type for the image preview in the input box
export interface ImagePreview {
  name: string;
  data: string; // base64 encoded for src attribute
  mimeType: string;
}

// Type for the structured logic file
export interface LogicFile {
  version: string;
  logic: string[]; // An array of strings representing individual logic points
}