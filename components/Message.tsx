import React, { useState } from 'react';
import { ChatMessage, MessagePart } from '../types';
import Icon from './Icon';

// Add a declaration for the global marked object from the CDN
declare const marked: { parse: (markdown: string) => string };

interface MessageProps {
  message: ChatMessage;
  onDeleteMessage: (messageId: string) => void;
  index: number;
}

const Message: React.FC<MessageProps> = ({ message, onDeleteMessage, index }) => {
  const { id, role, parts, citations, generationTime } = message;
  const isUser = role === 'user';
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (isCopied) return;
    const textToCopy = parts.map(p => p.text || '').join('\n');
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const renderContent = (part: MessagePart, index: number) => {
    if (part.text) {
      if (!part.text.trim()) return null; // Don't render empty text parts
      const htmlContent = marked.parse(part.text);
      return (
        <div 
          key={`text-${index}`} 
          className="prose prose-sm prose-invert max-w-none text-brand-text-primary [&_p]:my-2 [&_a]:text-brand-red" 
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        ></div>
      );
    }
    if (part.inlineData) {
      return (
        <div key={`img-${index}`} className="mt-2">
          <img
            src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
            alt="User upload"
            className="max-w-xs max-h-64 rounded-lg border border-brand-outline"
          />
        </div>
      );
    }
    return null;
  };
  
  const showLoader = !isUser && (!parts || parts.length === 0);

  return (
    <div className={`group/message flex items-start gap-4 my-6 opacity-0 animate-slide-up-fade ${isUser ? 'justify-end' : ''}`} style={{ animationDelay: `${Math.min(index * 100, 500)}ms` }}>
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-surface flex items-center justify-center border border-brand-outline">
          <Icon name="logo" className="w-6 h-6 text-brand-red" />
        </div>
      )}
      <div className={`relative p-4 rounded-xl max-w-2xl border ${isUser ? 'bg-brand-surface-light border-brand-outline' : 'bg-brand-surface border-brand-outline'}`}>
        {showLoader && (
             <div className="space-y-2.5">
                <div className="h-2.5 w-48 rounded-full bg-brand-surface-light animate-shimmer" style={{ background: 'linear-gradient(to right, #1E1E1E 4%, #2C2C2C 25%, #1E1E1E 36%)', backgroundSize: '1000px 100%'}}></div>
                <div className="h-2.5 w-32 rounded-full bg-brand-surface-light animate-shimmer" style={{ background: 'linear-gradient(to right, #1E1E1E 4%, #2C2C2C 25%, #1E1E1E 36%)', backgroundSize: '1000px 100%'}}></div>
            </div>
        )}
        <div className="flex flex-col space-y-2">
          {parts.map(renderContent)}
        </div>
        {citations && citations.length > 0 && (
          <div className="mt-4 pt-3 border-t border-brand-outline">
            <h4 className="text-sm font-semibold mb-2 text-brand-text-secondary flex items-center gap-2">
              <Icon name="citation" className="w-4 h-4" />
              Citations
            </h4>
            <ul className="space-y-2">
              {citations.map((citation, index) => (
                <li key={index} className="bg-brand-background/50 p-3 rounded-lg text-sm transition-colors hover:bg-brand-background">
                  <p className="font-mono text-xs text-brand-red mb-1.5" title={citation.fileName}>
                    {citation.fileName.length > 30 ? `${citation.fileName.slice(0,30)}...` : citation.fileName}
                  </p>
                  <blockquote className="border-l-2 border-brand-red/50 pl-2 text-brand-text-secondary italic text-xs">
                    "{citation.quote}"
                  </blockquote>
                </li>
              ))}
            </ul>
          </div>
        )}
        {generationTime && (
            <div className="text-right text-xs text-brand-text-secondary/60 pt-2 mt-2">
                Generated in {(generationTime / 1000).toFixed(2)}s
            </div>
        )}
        
        {/* Action Buttons */}
        {!showLoader && (
            <div className={`absolute top-1 flex items-center gap-1 opacity-0 group-hover/message:opacity-100 transition-opacity duration-300 transform scale-90 group-hover/message:scale-100 ${isUser ? 'left-2 -translate-x-full -ml-1' : 'right-2 translate-x-full mr-1'}`}>
                {!isUser && parts.some(p => p.text) && (
                    <button
                        onClick={handleCopy}
                        className="p-1.5 rounded-full text-brand-text-secondary hover:text-brand-text-primary bg-brand-surface-light border border-brand-outline hover:bg-brand-surface transition-transform hover:scale-110"
                        aria-label={isCopied ? "Copied" : "Copy"}
                        title={isCopied ? "Copied" : "Copy"}
                    >
                        <Icon name={isCopied ? "check" : "copy"} className="w-4 h-4" />
                    </button>
                )}
                <button
                    onClick={() => onDeleteMessage(id)}
                    className="p-1.5 rounded-full text-brand-text-secondary hover:text-brand-red bg-brand-surface-light border border-brand-outline hover:bg-brand-red/10 transition-transform hover:scale-110"
                    aria-label="Delete message"
                    title="Delete"
                >
                    <Icon name="trash" className="w-4 h-4" />
                </button>
            </div>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-surface-light flex items-center justify-center border border-brand-outline">
          <Icon name="user" className="w-5 h-5 text-brand-text-secondary" />
        </div>
      )}
    </div>
  );
};

export default Message;