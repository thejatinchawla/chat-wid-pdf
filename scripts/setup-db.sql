-- Setup script for Supabase database with pgvector
-- Run this in Supabase SQL Editor after running migrations

-- Enable pgvector extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS vector;

-- Note: Tables will be created by Prisma migrations
-- After running `npm run db:migrate`, run the following to create the vector index:

-- IMPORTANT: Choose the index type based on your embedding model:
-- 
-- Option 1: IVFFlat (for nomic-embed-text with 768 dimensions; default Ollama setup)
-- - Works with up to 2000 dimensions
-- - Good balance of speed and size
-- - Adjust 'lists' parameter: lists = rows / 1000 (approximately)
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Option 2: HNSW (for larger embeddings such as text-embedding-3-large with 3072 dimensions)
-- - Required for embeddings with more than 2000 dimensions
-- - Faster queries but larger index size
-- - Requires pgvector 0.5+
-- Uncomment the line below and comment out the IVFFlat index above if using large embeddings:
-- DROP INDEX IF EXISTS chunks_embedding_idx;
-- CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks 
-- USING hnsw (embedding vector_cosine_ops);

-- Verify the index was created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'chunks';

