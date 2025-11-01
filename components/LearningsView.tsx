import React, { useRef, useState, useEffect } from 'react';
import Icon from './Icon';

interface LogicViewProps {
  logic: string[] | null;
  onSetLogic: (logic: string[] | null) => void;
  onUpload: (content: string) => void;
  onDownload: () => void;
  onClear: () => void;
}

const LogicView: React.FC<LogicViewProps> = ({ 
    logic, onSetLogic, onUpload, onDownload, onClear
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newLogicText, setNewLogicText] = useState('');
  const listRef = useRef<HTMLUListElement>(null);

  // Auto-resizes all textareas in the list when the logic array changes
  useEffect(() => {
    if (listRef.current) {
        const textareas = listRef.current.querySelectorAll('textarea');
        textareas.forEach(textarea => {
            textarea.style.height = 'auto'; // Reset height to recalculate
            textarea.style.height = `${textarea.scrollHeight}px`;
        });
    }
  }, [logic]); // Dependency ensures it runs on add, delete, and load

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        onUpload(text);
      }
    };
    reader.onerror = (e) => console.error("Failed to read file", e);
    reader.readAsText(file);
    event.target.value = '';
  };
  
  const handleDeleteLogic = (index: number) => {
      if (!logic) return;
      const updatedLogic = logic.filter((_, i) => i !== index);
      onSetLogic(updatedLogic);
  };
  
  const handleAddLogic = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newLogicText.trim()) return;
      onSetLogic([...(logic || []), newLogicText.trim()]);
      setNewLogicText('');
  }
  
  const handleLogicTextChange = (index: number, newText: string) => {
      if (!logic) return;
      const updatedLogic = [...logic];
      updatedLogic[index] = newText;
      onSetLogic(updatedLogic);
  }

  const renderEmptyState = () => (
     <div className="flex flex-col items-center justify-center h-full text-brand-text-secondary animate-fade-in p-6 text-center">
        <div className="w-28 h-28 bg-brand-surface rounded-full flex items-center justify-center mb-6 ring-1 ring-brand-outline animate-slide-up-fade">
            <Icon name="lightbulb" className="w-14 h-14 text-brand-red" />
        </div>
        <h2 className="text-3xl font-bold text-brand-text-primary animate-slide-up-fade" style={{animationDelay: '100ms'}}>Build the AI's Logic</h2>
        <p className="mt-3 max-w-md animate-slide-up-fade" style={{animationDelay: '200ms'}}>
           Add rules and context for the AI by adding them here, loading a file, or saving them directly from the chat.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-sm animate-slide-up-fade" style={{animationDelay: '300ms'}}>
            <button
              onClick={() => onSetLogic([])}
              className="w-full sm:w-auto flex-1 bg-brand-red text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-700 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <Icon name="plus" className="w-5 h-5" />
              Create Logic
            </button>
            <button
              onClick={handleUploadClick}
              className="w-full sm:w-auto flex-1 bg-brand-surface text-brand-text-primary font-semibold py-3 px-6 rounded-lg hover:bg-brand-surface-light border border-brand-outline transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="upload" className="w-5 h-5" />
              Load Logic
            </button>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json,application/json" />
      </div>
  );


  if (logic === null) {
      return renderEmptyState();
  }

  return (
    <div className="relative h-full flex flex-col p-6">
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
            <header className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-brand-text-primary">Logic</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleUploadClick}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-surface rounded-lg transition-colors"
                        title="Upload Logic File"
                    >
                        <Icon name="upload" className="w-4 h-4" />
                        <span className="hidden md:inline">Upload</span>
                    </button>
                     <button
                        onClick={onDownload}
                        disabled={logic.length === 0}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-text-secondary hover:text-brand-text-primary hover:bg-brand-surface rounded-lg transition-colors disabled:opacity-50"
                        title="Save Logic to File"
                    >
                        <Icon name="save" className="w-4 h-4" />
                        <span className="hidden md:inline">Save</span>
                    </button>
                    <button
                        onClick={onClear}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-text-secondary hover:text-brand-red hover:bg-brand-red/10 rounded-lg transition-colors"
                        title="Clear All Logic"
                    >
                        <Icon name="trash" className="w-4 h-4" />
                    </button>
                </div>
            </header>
            
            <div className="flex-1 overflow-y-auto pr-2 -mr-4">
               {logic.length > 0 ? (
                    <ul ref={listRef} className="space-y-2">
                        {logic.map((point, index) => (
                             <li key={index} className="flex items-start gap-2 bg-brand-surface p-2 rounded-lg group animate-slide-up-fade" style={{ animationDelay: `${index * 50}ms` }}>
                                <Icon name="lightbulb" className="w-5 h-5 text-brand-red/70 shrink-0 ml-1 mt-1.5" />
                                <textarea
                                    value={point}
                                    onChange={(e) => handleLogicTextChange(index, e.target.value)}
                                    className="flex-1 bg-transparent focus:outline-none text-brand-text-primary text-sm resize-none overflow-y-hidden w-full px-1 py-1"
                                    placeholder="Enter logic point..."
                                    rows={1}
                                />
                                <button
                                    onClick={() => handleDeleteLogic(index)}
                                    className="p-1.5 rounded-full text-brand-text-secondary/50 opacity-0 group-hover:opacity-100 hover:text-brand-red hover:bg-brand-red/10 shrink-0 transition-all"
                                >
                                    <Icon name="close" className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center text-brand-text-secondary py-10">
                        <p>No logic defined yet.</p>
                        <p className="text-xs mt-1">Add points below or save them from the chat.</p>
                    </div>
                )}
            </div>

            <form onSubmit={handleAddLogic} className="mt-4 flex gap-2">
                <input
                    type="text"
                    value={newLogicText}
                    onChange={(e) => setNewLogicText(e.target.value)}
                    placeholder="Add a new logic point manually..."
                    className="flex-1 p-3 bg-brand-surface border border-brand-outline rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-red/70 text-sm"
                />
                <button type="submit" className="px-5 py-2 bg-brand-red text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50" disabled={!newLogicText.trim()}>
                    Add
                </button>
            </form>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json,application/json" />
    </div>
  );
};

export default LogicView;