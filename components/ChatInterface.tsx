import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, ImagePreview, MessagePart } from '../types';
import Message from './Message';
import Icon from './Icon';

const ChatInterface: React.FC<{
  messages: ChatMessage[];
  onSendMessage: (message: ChatMessage) => void;
  onStopGeneration: () => void;
  onDeleteMessage: (messageId: string) => void;
  isLoading: boolean;
  onSaveLogic: () => void;
  isGeneratingLogic: boolean;
}> = ({ messages, onSendMessage, onStopGeneration, onDeleteMessage, isLoading, onSaveLogic, isGeneratingLogic }) => {
  const [inputText, setInputText] = useState('');
  const [pastedImages, setPastedImages] = useState<ImagePreview[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = ["Is this for escalation?", "What criteria does this post meet?", "Summarize the key points from the documents.", "What is the overall sentiment?"];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
        scrollToBottom();
    }
  }, [messages, isLoading])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${scrollHeight}px`;
    }
  }, [inputText]);

  const handleSendMessage = async () => {
    if ((!inputText.trim() && pastedImages.length === 0) || isLoading) return;

    const parts: MessagePart[] = [];
    if (inputText.trim()) {
      parts.push({ text: inputText });
    }
    
    for (const image of pastedImages) {
      const base64Data = image.data.split(',')[1];
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: base64Data,
        }
      });
    }

    const newMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      parts,
    };
    onSendMessage(newMessage);
    setInputText('');
    setPastedImages([]);
  };

  const handleSuggestionClick = (suggestionText: string) => {
    setInputText(suggestionText);
    textareaRef.current?.focus();
  };

  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setPastedImages(prev => [
              ...prev,
              {
                name: file.name,
                data: e.target?.result as string,
                mimeType: file.type,
              },
            ]);
          };
          reader.readAsDataURL(file);
        }
        event.preventDefault();
      }
    }
  }, []);

  const removeImage = (index: number) => {
    setPastedImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-brand-background">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
            {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-brand-text-secondary animate-fade-in">
                <div className="w-28 h-28 bg-brand-surface rounded-full flex items-center justify-center mb-6 ring-1 ring-brand-outline animate-slide-up-fade">
                    <Icon name="logo" className="w-16 h-16 text-brand-red" />
                </div>
                <h2 className="text-3xl font-bold text-brand-text-primary animate-slide-up-fade" style={{ animationDelay: '100ms' }}>Social Listening LM</h2>
                <p className="mt-3 text-center max-w-sm animate-slide-up-fade" style={{ animationDelay: '200ms' }}>Upload sources, paste images, and start your analysis.</p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                {suggestions.map((text, i) => (
                    <button
                        key={i}
                        onClick={() => handleSuggestionClick(text)}
                        className="bg-brand-surface hover:bg-brand-surface-light border border-brand-outline text-brand-text-primary text-sm font-medium py-2 px-4 rounded-lg transition-all transform hover:scale-105 opacity-0 animate-slide-up-fade"
                        style={{ animationDelay: `${300 + i * 100}ms` }}
                    >
                        {text}
                    </button>
                ))}
                </div>
            </div>
            )}
            {messages.map((msg, index) => (
                <Message
                    key={msg.id}
                    message={msg}
                    onDeleteMessage={onDeleteMessage}
                    index={index}
                />
              )
            )}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <Message message={{id: 'loading', role: 'model', parts: []}} onDeleteMessage={() => {}} index={messages.length} />
            )}
            <div ref={messagesEndRef} />
        </div>
      </div>
      <div className="p-4 bg-brand-background/80 backdrop-blur-lg border-t border-brand-outline opacity-0 animate-slide-up-fade" style={{ animationDelay: '200ms' }}>
        <div className="max-w-4xl mx-auto">
            {isLoading && (
                <div className="flex justify-center mb-3 animate-fade-in">
                    <button 
                        onClick={onStopGeneration}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-brand-surface-light hover:bg-brand-red/80 border border-brand-outline hover:border-brand-red rounded-lg transition-all text-brand-text-primary transform hover:scale-105"
                    >
                        <Icon name="stop" className="w-4 h-4" />
                        Stop Generating
                    </button>
                </div>
            )}
            <div className="bg-brand-surface rounded-xl p-2 flex flex-col transition-all ring-2 ring-transparent focus-within:ring-brand-red/70 border border-brand-outline">
            {pastedImages.length > 0 && (
                <div className="p-2 grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-3 border-b border-brand-outline mb-2">
                {pastedImages.map((image, index) => (
                    <div key={index} className="relative animate-fade-in group w-20 h-20">
                    <img src={image.data} alt="pasted content" className="h-full w-full object-cover rounded-md border border-brand-outline" />
                    <button onClick={() => removeImage(index)} className="absolute -top-1.5 -right-1.5 bg-brand-red text-white rounded-full p-0.5 hover:bg-red-700 transition-all scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 ring-2 ring-brand-surface">
                        <Icon name="close" className="w-4 h-4" />
                    </button>
                    </div>
                ))}
                </div>
            )}
            <div className="flex items-end">
                <textarea
                ref={textareaRef}
                className="flex-1 bg-transparent text-brand-text-primary placeholder-brand-text-placeholder focus:outline-none resize-none px-2 self-center"
                placeholder="Ask a question or paste an image..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                rows={1}
                style={{maxHeight: '200px'}}
                disabled={isLoading}
                />
                <button
                    onClick={onSaveLogic}
                    disabled={isLoading || isGeneratingLogic || messages.length === 0}
                    className={`p-3 rounded-xl text-brand-text-secondary disabled:text-brand-text-secondary/50 disabled:cursor-not-allowed hover:bg-brand-surface-light hover:text-brand-red transition-all transform hover:scale-105 active:scale-95 disabled:animate-none relative group ${isGeneratingLogic ? 'animate-glow text-brand-red' : ''}`}
                    aria-label="Create logic from chat"
                    title="Create logic from chat context"
                >
                    {isGeneratingLogic ? (
                        <Icon name="activity" className="w-5 h-5" />
                    ) : (
                        <Icon name="lightbulb" className="w-5 h-5" />
                    )}
                </button>
                <button
                onClick={handleSendMessage}
                disabled={isLoading || (!inputText.trim() && pastedImages.length === 0)}
                className="bg-brand-red text-white p-3 rounded-xl disabled:bg-brand-surface-light disabled:text-brand-text-secondary disabled:cursor-not-allowed hover:bg-red-700 transition-all transform hover:scale-105 active:scale-95 ml-2 disabled:animate-none relative group"
                aria-label="Send message"
                >
                    <div className="absolute inset-0 rounded-xl bg-brand-red blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                    <Icon name="send" className="w-5 h-5 relative" />
                </button>
            </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;