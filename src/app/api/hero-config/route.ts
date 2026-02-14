import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const row = await prisma.heroConfig.findFirst({ orderBy: { updatedAt: 'desc' } });
  if (!row) {
    return NextResponse.json({
      heroType: 'none',
      heroMediaUrl: null,
      overlayColor: '#000000',
      overlayOpacity: 0.5,
      videoStartSeconds: null,
      videoEndSeconds: null,
      videoLoop: true,
    });
  }
  return NextResponse.json({
    heroType: row.heroType,
    heroMediaUrl: row.heroMediaUrl,
    overlayColor: row.overlayColor,
    overlayOpacity: row.overlayOpacity,
    videoStartSeconds: row.videoStartSeconds,
    videoEndSeconds: row.videoEndSeconds,
    videoLoop: row.videoLoop,
  });
}
