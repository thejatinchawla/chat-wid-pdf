/**
 * Embedding generation using Ollama (local, free).
 */

import { config } from './config';

async function generateEmbeddingWithOllama(text: string): Promise<number[]> {
  const url = `${config.ollamaHost.replace(/\/$/, '')}/api/embed`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.embeddingModel,
      input: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama embedding request failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { embeddings?: number[]; error?: string };
  console.log('Data', data);
  if (!data.embeddings) {
    throw new Error(data.error || 'Ollama embedding response missing embedding field');
  }
  return data.embeddings;
}

/**
 * Generate embedding for a text string
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    return await generateEmbeddingWithOllama(text);
  } catch (error) {
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for multiple texts (batched)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    // Ollama API currently handles one input at a time; run sequentially to avoid overload
    const results: number[][] = [];
    for (const t of texts) {
      results.push(await generateEmbeddingWithOllama(t));
    }
    return results;
  } catch (error) {
    throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

