import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const row = await prisma.siteSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
    const defaults = {
      supportEmail: 'contato@flygames.com.br',
      whatsappNumber: '5511999999999',
      instagramUrl: 'https://instagram.com',
      tiktokUrl: null as string | null,
      youtubeUrl: null as string | null,
      companyName: 'Fly Games',
      companyCnpj: '',
      gaMeasurementId: null as string | null,
      fbPixelId: null as string | null,
      tiktokPixelId: null as string | null,
    };
    if (!row) return NextResponse.json(defaults);
    return NextResponse.json({
      supportEmail: row.supportEmail ?? defaults.supportEmail,
      whatsappNumber: row.whatsappNumber ?? defaults.whatsappNumber,
      instagramUrl: row.instagramUrl ?? defaults.instagramUrl,
      tiktokUrl: row.tiktokUrl ?? defaults.tiktokUrl,
      youtubeUrl: row.youtubeUrl ?? defaults.youtubeUrl,
      companyName: row.companyName ?? defaults.companyName,
      companyCnpj: row.companyCnpj ?? defaults.companyCnpj,
      gaMeasurementId: row.gaMeasurementId ?? defaults.gaMeasurementId,
      fbPixelId: row.fbPixelId ?? defaults.fbPixelId,
      tiktokPixelId: row.tiktokPixelId ?? defaults.tiktokPixelId,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        supportEmail: 'contato@flygames.com.br',
        whatsappNumber: '5511999999999',
        instagramUrl: 'https://instagram.com',
        tiktokUrl: null,
        youtubeUrl: null,
        companyName: 'Fly Games',
        companyCnpj: '',
      },
      { status: 200 }
    );
  }
}
