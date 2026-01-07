/**
 * Prompt building for grounded RAG responses
 */

import { RetrievedChunk } from './retrieval';
import { config } from './config';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Build system prompt with strict grounding instructions
 */
function buildSystemPrompt(): string {
  return `You are a helpful assistant that answers questions based ONLY on the provided context documents. 

CRITICAL RULES:
1. You MUST answer using ONLY the information provided in the context below.
2. If the answer is not in the context, you MUST say "I don't know" or "The information is not available in the provided documents."
3. DO NOT use any prior knowledge or information outside the provided context.
4. When you reference information from the context, cite the source using the citation format provided.
5. Be concise and accurate. If you're uncertain, say so.

You will receive:
- A user question
- Relevant context chunks from documents with citations

Format your response as:
1. Your answer based on the context
2. Citations in the format: [Document: Title, Chunk: N, Page: X] (Page is optional if not available)`;
}

/**
 * Build user prompt with context and question
 */
function buildUserPrompt(question: string, chunks: RetrievedChunk[]): string {
  const contextParts = chunks.map((chunk, idx) => {
    const pageInfo = chunk.page ? `, Page: ${chunk.page}` : '';
    return `[Context ${idx + 1}]
Document: ${chunk.documentTitle}
Chunk Index: ${chunk.chunkIndex}${pageInfo}
Content: ${chunk.content}

---`;
  });

  return `Question: ${question}

Context:
${contextParts.join('\n\n')}

Please answer the question using ONLY the information from the context above. If the answer is not in the context, say you don't know. Include citations for any information you use.`;
}

/**
 * Build messages array for OpenAI chat completion
 */
export function buildChatMessages(question: string, chunks: RetrievedChunk[]): ChatMessage[] {
  return [
    {
      role: 'system',
      content: buildSystemPrompt(),
    },
    {
      role: 'user',
      content: buildUserPrompt(question, chunks),
    },
  ];
}

/**
 * Extract citations from assistant response (if any)
 * This is a helper to parse citations from the response text
 */
export function extractCitations(response: string, chunks: RetrievedChunk[]): Array<{
  documentTitle: string;
  chunkIndex: number;
  page: number | null;
  snippet: string;
}> {
  const citations: Array<{
    documentTitle: string;
    chunkIndex: number;
    page: number | null;
    snippet: string;
  }> = [];

  // Simple regex to find citation patterns like [Document: X, Chunk: N, Page: Y]
  const citationRegex = /\[Document:\s*([^,]+),\s*Chunk:\s*(\d+)(?:,\s*Page:\s*(\d+))?\]/gi;
  let match;

  while ((match = citationRegex.exec(response)) !== null) {
    const documentTitle = match[1].trim();
    const chunkIndex = parseInt(match[2], 10);
    const page = match[3] ? parseInt(match[3], 10) : null;

    // Find the corresponding chunk
    const chunk = chunks.find(
      c => c.documentTitle === documentTitle && c.chunkIndex === chunkIndex
    );

    if (chunk) {
      citations.push({
        documentTitle,
        chunkIndex,
        page,
        snippet: chunk.content.substring(0, 150) + '...',
      });
    }
  }

  // If no citations found in response, return all chunks as citations (fallback)
  if (citations.length === 0 && chunks.length > 0) {
    return chunks.map(chunk => ({
      documentTitle: chunk.documentTitle,
      chunkIndex: chunk.chunkIndex,
      page: chunk.page,
      snippet: chunk.content.substring(0, 150) + '...',
    }));
  }

  return citations;
}

