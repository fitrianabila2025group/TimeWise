import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const startTime = Date.now();

export const dynamic = 'force-dynamic';

export async function GET() {
  let dbStatus = 'ok';
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
  } catch (e) {
    dbStatus = 'down';
    console.error('Health check DB error:', e);
  }

  return NextResponse.json({
    ok: dbStatus === 'ok',
    db: dbStatus,
    version: '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
}
