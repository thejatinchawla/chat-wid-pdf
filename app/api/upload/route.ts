/**
 * POST /api/upload
 * Upload and index a PDF or TXT file
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { config } from '@/lib/config';
import { extractText } from '@/lib/extract';
import { chunkText } from '@/lib/chunk';
import { generateEmbeddings } from '@/lib/embeddings';

const uploadSchema = z.object({
  file: z.instanceof(File),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size
    if (file.size > config.maxFileSize) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${config.maxFileSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate MIME type
    const mimeType = file.type;
    if (mimeType !== 'application/pdf' && mimeType !== 'text/plain') {
      return NextResponse.json(
        { error: 'Only PDF and TXT files are supported' },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    const uploadDir = config.uploadDir;
    await mkdir(uploadDir, { recursive: true });

    // Save file
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create document record
    const document = await prisma.document.create({
      data: {
        userId: config.demoUserId,
        title: file.name,
        filePath,
        mimeType,
      },
    });

    // Extract text
    const extracted = await extractText(filePath, mimeType);

    // Chunk text
    const chunks = chunkText(extracted.text);

    console.log('Chunks', chunks);

    // Generate embeddings for all chunks
    const chunkContents = chunks.map(c => c.content);
    const embeddings = await generateEmbeddings(chunkContents);

    console.log('Embeddings', embeddings);
    // Store chunks with embeddings
    // Note: Prisma doesn't support vector type directly, so we use raw SQL
    // For page calculation: approximate based on token position relative to total tokens
    const totalTokens = chunks.length > 0 ? chunks[chunks.length - 1].tokenEnd : 1;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      const embeddingStr = `[${embedding.join(',')}]`;

      // Approximate page number based on token position (simple linear interpolation)
      let pageNum: number | null = null;
      if (extracted.pages && totalTokens > 0) {
        const tokenRatio = chunk.tokenStart / totalTokens;
        pageNum = Math.min(Math.max(1, Math.ceil(tokenRatio * extracted.pages)), extracted.pages);
      }

      // Use parameterized query for safety
      await prisma.$executeRawUnsafe(
        `INSERT INTO chunks (id, document_id, chunk_index, content, embedding, page, created_at)
         VALUES (gen_random_uuid(), $1::uuid, $2::int, $3::text, $4::vector, $5::int, NOW())`,
        document.id,
        chunk.chunkIndex,
        chunk.content,
        embeddingStr,
        pageNum
      );
    }

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        createdAt: document.createdAt,
      },
      chunksCount: chunks.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload and index file' },
      { status: 500 }
    );
  }
}

