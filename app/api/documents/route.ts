/**
 * GET /api/documents
 * List all documents for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
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

