import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { invalidateAdsCache } from '@/lib/ads';

const VALID_PROVIDERS = ['adsense', 'adsterra', 'monetag', 'hilltopads', 'custom'] as const;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let settings = await prisma.adsSetting.findFirst();
  if (!settings) {
    settings = await prisma.adsSetting.create({ data: {} });
  }
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  // Validate provider
  if (body.provider && !VALID_PROVIDERS.includes(body.provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  // Validate slotsJson is valid JSON
  if (body.slotsJson !== undefined) {
    try {
      JSON.parse(body.slotsJson);
    } catch {
      return NextResponse.json({ error: 'slotsJson must be valid JSON' }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = {};
  if (body.provider !== undefined) data.provider = body.provider;
  if (body.adsenseClientId !== undefined) data.adsenseClientId = body.adsenseClientId;
  if (body.adsTxtLines !== undefined) data.adsTxtLines = body.adsTxtLines;
  if (body.headHtml !== undefined) data.headHtml = body.headHtml;
  if (body.bodyHtml !== undefined) data.bodyHtml = body.bodyHtml;
  if (body.slotsJson !== undefined) data.slotsJson = body.slotsJson;
  if (body.verificationMeta !== undefined) data.verificationMeta = body.verificationMeta;

  let settings = await prisma.adsSetting.findFirst();
  if (settings) {
    settings = await prisma.adsSetting.update({ where: { id: settings.id }, data });
  } else {
    settings = await prisma.adsSetting.create({ data });
  }

  invalidateAdsCache();

  await prisma.auditLog.create({
    data: {
      userId: (session.user as any).id,
      action: 'UPDATE',
      entityType: 'AdsSetting',
      entityId: settings.id,
      details: 'Updated ads settings',
    },
  });

  return NextResponse.json({ settings });
}
