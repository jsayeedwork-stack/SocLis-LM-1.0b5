// NOTE: This service now handles PDF, TXT, and MD files.
// The filename is kept for backward compatibility.

// Add a declaration for the global pdfjsLib
declare const pdfjsLib: any;

import { Document } from '../types';

const parsePdf = async (file: File): Promise<Document> => {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onload = async (event) => {
      if (!event.target?.result) {
        return reject(new Error("Failed to read file"));
      }
      try {
        const typedArray = new Uint8Array(event.target.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(" ");
          fullText += pageText + "\n\n";
        }
        resolve({
          fileName: file.name,
          content: fullText,
        });
      } catch (error) {
        console.error("Error parsing PDF:", error);
        reject(new Error("Could not parse the PDF file."));
      }
    };
    fileReader.onerror = (error) => reject(error);
    fileReader.readAsArrayBuffer(file);
  });
};

const parseTextFile = (file: File): Promise<Document> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                resolve({
                    fileName: file.name,
                    content: event.target.result as string,
                });
            } else {
                reject(new Error("Failed to read text file."));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
};

export const parseFile = async (file: File): Promise<Document> => {
    if (file.type === 'application/pdf') {
        return parsePdf(file);
    } else if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        return parseTextFile(file);
    } else {
        return Promise.reject(new Error(`Unsupported file: ${file.name}. Please upload PDF, TXT, or MD files.`));
    }
};
