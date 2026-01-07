/**
 * Embedding generation supporting both Ollama (local, free) and OpenAI (hosted).
 */

import OpenAI from 'openai';
import { config } from './config';

const useOllama = config.useOllama;

// Lazily initialize OpenAI client only if needed
let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is required when USE_OLLAMA=false');
  }
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

async function generateEmbeddingWithOpenAI(text: string): Promise<number[]> {
  const client = getOpenAI();
  const response = await client.embeddings.create({
    model: config.embeddingModel,
    input: text,
  });
  return response.data[0].embedding;
}

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
    return useOllama
      ? await generateEmbeddingWithOllama(text)
      : await generateEmbeddingWithOpenAI(text);
  } catch (error) {
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for multiple texts (batched)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    if (useOllama) {
      // Ollama API currently handles one input at a time; run sequentially to avoid overload
      const results: number[][] = [];
      for (const t of texts) {
        results.push(await generateEmbeddingWithOllama(t));
      }
      return results;
    }

    const client = getOpenAI();
    const response = await client.embeddings.create({
      model: config.embeddingModel,
      input: texts,
    });
    return response.data.map(item => item.embedding);
  } catch (error) {
    throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

