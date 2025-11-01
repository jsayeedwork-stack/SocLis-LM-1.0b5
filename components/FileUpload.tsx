import React, { useState } from 'react';
import { Document } from '../types';
import { parseFile } from '../services/pdfParserService';
import Icon from './Icon';

interface FileUploadProps {
  documents: Document[];
  onNewDocuments: (docs: Document[]) => void;
  onRemoveDocument: (fileName: string) => void;
  onClose?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ documents, onNewDocuments, onRemoveDocument, onClose }) => {
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newFiles = [...event.target.files];
      setError(null);
      setIsParsing(true);
      try {
        const results = await Promise.allSettled(newFiles.map(file => parseFile(file)));

        const successfulDocs: Document[] = [];
        const failedFileNames: string[] = [];

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successfulDocs.push(result.value);
          } else {
            failedFileNames.push(newFiles[index].name);
            console.error(`Error parsing ${newFiles[index].name}:`, result.reason);
          }
        });

        if (successfulDocs.length > 0) {
          onNewDocuments(successfulDocs);
        }

        if (failedFileNames.length > 0) {
          setError(`Failed to parse: ${failedFileNames.join(', ')}`);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred during parsing.');
      } finally {
        setIsParsing(false);
        event.target.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col flex-grow h-full">
        <div className="flex justify-between items-center mb-4 shrink-0">
            <h2 className="text-xl font-bold text-brand-text-primary">Sources</h2>
            {onClose && (
                <button onClick={onClose} className="p-1.5 rounded-full text-brand-text-secondary hover:text-brand-red hover:bg-brand-red/10 transition-transform transform hover:scale-110">
                    <Icon name="close" className="w-5 h-5" />
                </button>
            )}
        </div>
        <div className="mb-4">
            <label 
            htmlFor="file-upload" 
            className="relative block w-full p-6 text-center border-2 border-dashed rounded-xl cursor-pointer border-brand-outline hover:border-brand-red/70 hover:bg-brand-surface-light/50 transition-all duration-300 group"
            >
            <div className="flex flex-col items-center justify-center">
                <Icon name="upload" className="w-8 h-8 mb-3 text-brand-text-secondary transition-transform transform group-hover:scale-110" />
                <span className="text-sm font-semibold text-brand-text-primary">Click or drag to upload</span>
                <span className="mt-1 text-xs text-brand-text-secondary">PDF, TXT, MD files supported</span>
            </div>
            </label>
            <input id="file-upload" type="file" className="hidden" accept=".pdf,.txt,.md,text/plain,text/markdown" onChange={handleFileChange} multiple disabled={isParsing} />
        </div>
        {isParsing && <p className="text-sm text-center text-yellow-400 animate-pulse">Parsing file(s)...</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex-grow overflow-y-auto mt-2 pr-1 -mr-4">
            {documents.length > 0 ? (
            <ul className="space-y-2">
                {documents.map((doc, index) => (
                <li 
                    key={doc.fileName} 
                    className="flex items-center justify-between bg-brand-surface-light p-3 rounded-lg group transition-all opacity-0 animate-slide-up-fade"
                    style={{ animationDelay: `${index * 75}ms` }}
                >
                    <div className="flex items-center min-w-0">
                    <Icon name="document" className="w-5 h-5 text-brand-red mr-3 shrink-0" />
                    <span className="text-sm font-medium text-brand-text-primary truncate" title={doc.fileName}>{doc.fileName}</span>
                    </div>
                    <button 
                        onClick={() => onRemoveDocument(doc.fileName)}
                        className="p-1 rounded-full text-brand-text-secondary/50 opacity-0 group-hover:opacity-100 hover:text-brand-red hover:bg-brand-red/10 shrink-0 transition-all transform group-hover:scale-110"
                        aria-label={`Remove ${doc.fileName}`}
                    >
                        <Icon name="close" className="w-4 h-4" />
                    </button>
                </li>
                ))}
            </ul>
            ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-brand-text-secondary/60 p-4 animate-fade-in">
                <Icon name="document" className="w-12 h-12 mb-3" />
                <p className="text-sm font-semibold">No documents uploaded.</p>
                <p className="text-xs mt-1">Your sources will appear here.</p>
            </div>
            )}
        </div>
    </div>
  );
};

export default FileUpload;