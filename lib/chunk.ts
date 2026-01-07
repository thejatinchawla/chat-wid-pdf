/**
 * Token-aware text chunking with overlap
 */

import { encoding_for_model } from 'tiktoken';
import { config } from './config';

export interface Chunk {
  content: string;
  tokenStart: number;
  tokenEnd: number;
  chunkIndex: number;
}

/**
 * Chunk text using token-aware splitting with overlap
 */
export function chunkText(text: string, page?: number): Chunk[] {
  // Use cl100k_base encoding (compatible with most models)
  const encoding = encoding_for_model('gpt-4o-mini');
  
  const tokens = encoding.encode(text);
  const chunks: Chunk[] = [];
  const chunkSize = config.chunkSizeTokens;
  const overlap = config.overlapTokens;

  let chunkIndex = 0;
  let tokenStart = 0;

  while (tokenStart < tokens.length) {
    const tokenEnd = Math.min(tokenStart + chunkSize, tokens.length);
    const chunkTokens = tokens.slice(tokenStart, tokenEnd);
    const decoded = encoding.decode(chunkTokens);
    const content = typeof decoded === 'string' ? decoded : new TextDecoder().decode(decoded);

    chunks.push({
      content: content.trim(),
      tokenStart,
      tokenEnd,
      chunkIndex,
    });

    // Move forward by chunkSize - overlap to create overlap
    tokenStart += chunkSize - overlap;
    chunkIndex++;

    // Prevent infinite loop if overlap >= chunkSize
    if (overlap >= chunkSize) {
      break;
    }
  }

  encoding.free();
  return chunks;
}

