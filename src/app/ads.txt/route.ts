import { NextResponse } from 'next/server';
import { getAdsSettings } from '@/lib/ads';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ads = await getAdsSettings();
  const content = ads?.adsTxtLines?.trim() || '';

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
