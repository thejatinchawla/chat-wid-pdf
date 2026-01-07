/**
 * GET /api/documents
 * List all documents for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { prisma } from '@/lib/db';
import { config } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    const documents = await prisma.document.findMany({
      where: {
        userId: config.demoUserId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: { chunks: true },
        },
      },
    });

    return NextResponse.json({
      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        mimeType: doc.mimeType,
        createdAt: doc.createdAt,
        chunksCount: doc._count.chunks,
      })),
    });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents
 * Delete a document (and its chunks) for the current user
 */
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Document id is required' }, { status: 400 });
    }

    // Fetch document to validate ownership and file path
    const document = await prisma.document.findFirst({
      where: {
        id,
        userId: config.demoUserId,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete chunks then document
    await prisma.$transaction([
      prisma.chunk.deleteMany({ where: { documentId: id } }),
      prisma.document.delete({ where: { id } }),
    ]);

    // Attempt to remove file from disk (ignore if already gone)
    if (document.filePath) {
      try {
        await unlink(document.filePath);
      } catch (err) {
        console.warn('File removal skipped:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete document' },
      { status: 500 }
    );
  }
}

