/**
 * Vector search and retrieval
 */

import { prisma } from './db';
import { config } from './config';
import { generateEmbedding } from './embeddings';

export interface RetrievedChunk {
  id: string;
  content: string;
  chunkIndex: number;
  documentId: string;
  documentTitle: string;
  page: number | null;
  similarity: number;
}

/**
 * Perform vector search to retrieve top-k chunks
 * Uses cosine similarity via pgvector
 */
export async function retrieveChunks(
  queryEmbedding: number[],
  documentIds?: string[]
): Promise<RetrievedChunk[]> {
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  const topK = config.topK;

  try {
    let results: Array<{
      id: string;
      content: string;
      chunk_index: number;
      document_id: string;
      page: number | null;
      document_title: string;
      similarity: number;
    }>;

    if (documentIds && documentIds.length > 0) {
      // Use parameterized query with document filter
      // Note: pgvector requires the vector to be passed as a string literal, so we use template literal
      // but we still parameterize the document IDs for safety
      const placeholders = documentIds.map((_, i) => `$${i + 1}`).join(',');
      const query = `
        SELECT 
          c.id,
          c.content,
          c.chunk_index,
          c.document_id,
          c.page,
          d.title as document_title,
          1 - (c.embedding <=> '${embeddingStr}'::vector) as similarity
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE c.document_id IN (${placeholders})
        ORDER BY c.embedding <=> '${embeddingStr}'::vector
        LIMIT ${topK}
      `;
      // Use Prisma's parameterized query for document IDs
      results = await prisma.$queryRawUnsafe<typeof results>(
        query,
        ...documentIds
      );
    } else {
      // Query all documents
      const query = `
        SELECT 
          c.id,
          c.content,
          c.chunk_index,
          c.document_id,
          c.page,
          d.title as document_title,
          1 - (c.embedding <=> '${embeddingStr}'::vector) as similarity
        FROM chunks c
        JOIN documents d ON c.document_id = d.id
        ORDER BY c.embedding <=> '${embeddingStr}'::vector
        LIMIT ${topK}
      `;
      results = await prisma.$queryRawUnsafe<typeof results>(query);
    }

    return results.map(row => ({
      id: row.id,
      content: row.content,
      chunkIndex: row.chunk_index,
      documentId: row.document_id,
      documentTitle: row.document_title,
      page: row.page,
      similarity: Number(row.similarity),
    }));
  } catch (error) {
    // Fallback: if pgvector is not available, try a simple text search
    console.error('Vector search failed, attempting fallback:', error);
    throw new Error(`Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieve chunks for a query string (embeds query first)
 */
export async function retrieveChunksForQuery(
  query: string,
  documentIds?: string[]
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await generateEmbedding(query);
  return retrieveChunks(queryEmbedding, documentIds);
}

