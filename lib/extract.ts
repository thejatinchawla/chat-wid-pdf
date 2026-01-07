/**
 * Text extraction from PDF and TXT files
 */

import pdf from 'pdf-parse';
import { readFile } from 'fs/promises';
import { join } from 'path';

export interface ExtractedText {
  text: string;
  pages?: number; // For PDFs
}

/**
 * Extract text from a PDF file
 */
export async function extractFromPDF(filePath: string): Promise<ExtractedText> {
  try {
    const dataBuffer = await readFile(filePath);
    const data = await pdf(dataBuffer);
    return {
      text: data.text,
      pages: data.numpages,
    };
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from a TXT file
 */
export async function extractFromTXT(filePath: string): Promise<ExtractedText> {
  try {
    const text = await readFile(filePath, 'utf-8');
    return { text };
  } catch (error) {
    throw new Error(`Failed to extract text from TXT: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text based on MIME type
 */
export async function extractText(filePath: string, mimeType: string): Promise<ExtractedText> {
  if (mimeType === 'application/pdf') {
    return extractFromPDF(filePath);
  } else if (mimeType === 'text/plain' || mimeType.startsWith('text/')) {
    return extractFromTXT(filePath);
  } else {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }
}

