/**
 * Application configuration
 */

export const config = {
  // Chunking configuration
  chunkSizeTokens: parseInt(process.env.CHUNK_SIZE_TOKENS || '800', 10),
  overlapTokens: parseInt(process.env.OVERLAP_TOKENS || '150', 10),

  // Retrieval configuration
  topK: parseInt(process.env.TOP_K || '6', 10),

  // OpenAI configuration
  // Defaults set for Ollama (free/local). To use OpenAI, set USE_OLLAMA=false and provide OPENAI_API_KEY.
  // Ollama defaults: nomic-embed-text (768 dims), llama3.1:8b for chat.
  // If you switch to OpenAI embeddings, adjust vector dimensions and index accordingly.
  useOllama: process.env.USE_OLLAMA?.toLowerCase() === 'true' || !process.env.OPENAI_API_KEY,
  ollamaHost: process.env.OLLAMA_HOST || 'http://localhost:11434',
  embeddingModel: process.env.EMBEDDING_MODEL || 'nomic-embed-text',
  chatModel: process.env.CHAT_MODEL || 'llama3.1:8b',

  // File upload configuration
  uploadDir: process.env.UPLOAD_DIR || './data/uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '15', 10) * 1024 * 1024, // 15MB default

  // Demo user (simple auth stub)
  demoUserId: process.env.DEMO_USER_ID || 'demo-user-1',
} as const;

