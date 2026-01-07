/**
 * GET /api/health
 * Health check endpoint
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', database: 'disconnected', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}

