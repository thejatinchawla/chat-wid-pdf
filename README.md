# Chat with Your Documents - RAG Application

A complete MVP "Chat with Your Documents" RAG (Retrieval-Augmented Generation) application built with Next.js, TypeScript, PostgreSQL, and pgvector.

## Features

- **Document Upload**: Upload PDF and TXT files
- **Text Extraction**: Automatic text extraction from uploaded documents
- **Intelligent Chunking**: Token-aware chunking with configurable overlap
- **Vector Embeddings**: Generate embeddings using Ollama's nomic-embed-text model
- **Vector Search**: Fast similarity search using pgvector
- **RAG Chat**: Chat with your documents with grounded responses and citations
- **Document Selection**: Choose specific documents or chat with all documents

## Architecture

### Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL with pgvector extension)
- **ORM**: Prisma
- **AI**: Ollama (embeddings + chat)
- **Text Processing**: pdf-parse, tiktoken

### Project Structure

```
├── app/
│   ├── api/
│   │   ├── upload/      # File upload and indexing endpoint
│   │   ├── documents/   # List documents endpoint
│   │   ├── chat/        # RAG chat endpoint
│   │   └── health/      # Health check endpoint
│   ├── upload/          # Upload page
│   ├── chat/            # Chat interface page
│   └── layout.tsx       # Root layout
├── lib/
│   ├── config.ts        # Application configuration
│   ├── db.ts            # Prisma client
│   ├── extract.ts       # PDF/TXT text extraction
│   ├── chunk.ts         # Token-aware chunking
│   ├── embeddings.ts    # Ollama embedding generation
│   ├── retrieval.ts     # Vector search and retrieval
│   └── prompt.ts        # RAG prompt building
├── prisma/
│   └── schema.prisma    # Database schema
└── data/
    └── uploads/         # Uploaded files storage
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account (free tier works)
- Ollama installed locally (https://ollama.com/download)

### 1. Install Dependencies

```bash
npm install
```

### 2. Install and Start Ollama (default, free/local)

- Download and install Ollama: https://ollama.com/download
- Start the Ollama service (installer usually starts it automatically). Verify with:
  ```bash
  ollama list
  ```
- Pull required models:
  ```bash
  ollama pull nomic-embed-text
  ollama pull llama3.1:8b
  ```
  (You can choose a smaller chat model if desired, e.g., `llama3.1:8b-instruct` or `llama3.1:latest`.)

### 3. Set Up Supabase

1. **Create a Supabase Project**:
   - Go to [https://supabase.com](https://supabase.com)
   - Sign up or log in
   - Click "New Project"
   - Choose a name, database password, and region
   - Wait for the project to be created (takes ~2 minutes)

2. **Enable pgvector Extension**:
   - Go to your project dashboard
   - Navigate to **Database** → **Extensions**
   - Search for "vector" and enable it
   - Or run this SQL in the SQL Editor:
     ```sql
     CREATE EXTENSION IF NOT EXISTS vector;
     ```

3. **Get Your Connection String**:
   - Go to **Project Settings** → **Database**
   - Find the **Connection string** section
   - Copy the **URI** connection string (it looks like: `postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres`)
   - Replace `[YOUR-PASSWORD]` with your database password

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
touch .env
```

Add the following variables:

**Required:**
- `DATABASE_URL`: Your Supabase connection string
  - Format: `postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres`
  - Get it from: Supabase Dashboard → Project Settings → Database → Connection string (URI)

**Optional (with defaults):**
- `OLLAMA_HOST`: Ollama host (default: `http://localhost:11434`)
- `UPLOAD_DIR`: Directory for uploaded files (default: `./data/uploads`)
- `CHUNK_SIZE_TOKENS`: Chunk size in tokens (default: 800)
- `OVERLAP_TOKENS`: Overlap between chunks (default: 150)
- `TOP_K`: Number of chunks to retrieve (default: 6)
- `EMBEDDING_MODEL`: Embedding model (default: `nomic-embed-text` for Ollama)
- `CHAT_MODEL`: Chat model (default: `llama3.1:8b` for Ollama)
- `MAX_FILE_SIZE_MB`: Maximum file size in MB (default: 15)
- `DEMO_USER_ID`: Demo user ID (default: `demo-user-1`)

Example `.env` file:
```env
DATABASE_URL="postgresql://postgres:your-password@xxxxx.supabase.co:5432/postgres"
```

### 5. Set Up Database Schema

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate
```

### 6. Create Vector Index

After running migrations, create the vector index for efficient similarity search:

**Important**: The default `nomic-embed-text` model uses 768 dimensions, which works with IVFFlat index.

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the appropriate SQL based on your embedding model:

**For `nomic-embed-text` (default, 768 dimensions) - Use IVFFlat:**
```sql
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

**Note**: 
- The `lists` parameter for IVFFlat should be approximately `rows / 1000` for optimal performance. Start with 100 and increase as your data grows.

### 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### 1. Upload Documents

1. Navigate to `/upload`
2. Select a PDF or TXT file
3. Click "Upload & Index"
4. Wait for the file to be processed (text extraction, chunking, embedding generation)

### 2. Chat with Documents

1. Navigate to `/chat`
2. Select documents from the sidebar (or leave all selected)
3. Type your question and press Enter
4. View the response with citations

## How It Works

### Upload Flow

1. **File Upload**: File is saved to disk
2. **Text Extraction**: 
   - PDF: Uses `pdf-parse` to extract text and page count
   - TXT: Reads file as UTF-8
3. **Chunking**: 
   - Uses `tiktoken` for token-aware splitting
   - Creates chunks of ~800 tokens with 150 token overlap
   - Preserves context across chunk boundaries
4. **Embedding Generation**: 
   - Generates embeddings for all chunks using Ollama (`nomic-embed-text`, 768 dims)
5. **Storage**: 
   - Stores chunks with embeddings in PostgreSQL
   - Uses pgvector's `vector` type for efficient storage

### Chat Flow

1. **Query Embedding**: User question is embedded using the same model
2. **Vector Search**: 
   - Performs cosine similarity search using pgvector
   - Retrieves top-k most similar chunks
   - Optionally filters by selected documents
3. **Context Building**: 
   - Builds prompt with system instructions for grounded responses
   - Includes retrieved chunks with metadata
4. **Response Generation**: 
   - Sends to Ollama chat model (llama3.1:8b by default)
   - Model is instructed to only use provided context
   - Returns "I don't know" if answer isn't in context
5. **Citation Extraction**: 
   - Parses citations from response
   - Displays document name, chunk index, and page number

## Database Schema

### Document Table

- `id`: UUID primary key
- `user_id`: String (demo user for MVP)
- `title`: File name
- `file_path`: Path to uploaded file
- `mime_type`: MIME type (application/pdf or text/plain)
- `created_at`: Timestamp

### Chunk Table

- `id`: UUID primary key
- `document_id`: Foreign key to Document
- `chunk_index`: Sequential chunk number
- `content`: Chunk text content
- `embedding`: Vector(768) - pgvector type (for nomic-embed-text)
- `page`: Optional page number (for PDFs)
- `created_at`: Timestamp

## Configuration

All configuration is in `lib/config.ts` and can be overridden via environment variables. Key settings:

- **Chunking**: 800 tokens with 150 token overlap (configurable)
- **Retrieval**: Top 6 chunks by default (configurable)
- **Models**: 
  - Embeddings: `nomic-embed-text` (768 dims, works with IVFFlat index)
  - Chat: `llama3.1:8b` (default)

## Troubleshooting

### pgvector Not Available

If you see errors about pgvector, ensure:
1. The extension is enabled in Supabase: Go to Database → Extensions → enable "vector"
2. Or run in SQL Editor: `CREATE EXTENSION IF NOT EXISTS vector;`
3. The vector index is created (see step 5 in setup)
4. Your connection string is correct and includes the password

### Large Files

- Default max file size is 15MB
- Increase `MAX_FILE_SIZE_MB` in `.env` if needed
- Consider chunking very large documents manually

### Slow Embedding Generation

- Embeddings are generated in batches
- For many chunks, this may take time
- The default `nomic-embed-text` runs locally via Ollama

## Production Considerations

- **Authentication**: Currently uses a demo user. Implement proper auth for production
- **File Storage**: Consider using S3 or similar for file storage
- **Rate Limiting**: Add rate limiting to API endpoints
- **Error Handling**: Enhance error messages and logging
- **Monitoring**: Add monitoring for embedding costs and performance
- **Caching**: Consider caching embeddings for frequently accessed documents

## License

MIT

