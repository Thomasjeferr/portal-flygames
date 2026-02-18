import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  try {
    const row = await prisma.siteSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (!row)
      return NextResponse.json({
        supportEmail: '',
        adminCredentialsEmail: '',
        whatsappNumber: '',
        instagramUrl: '',
        tiktokUrl: '',
        youtubeUrl: '',
        companyName: 'Fly Games',
        companyCnpj: '',
        gaMeasurementId: '',
        fbPixelId: '',
        tiktokPixelId: '',
      });
    return NextResponse.json({
      supportEmail: row.supportEmail ?? '',
      adminCredentialsEmail: row.adminCredentialsEmail ?? '',
      whatsappNumber: row.whatsappNumber ?? '',
      instagramUrl: row.instagramUrl ?? '',
      tiktokUrl: row.tiktokUrl ?? '',
      youtubeUrl: row.youtubeUrl ?? '',
      companyName: row.companyName ?? '',
      companyCnpj: row.companyCnpj ?? '',
      gaMeasurementId: row.gaMeasurementId ?? '',
      fbPixelId: row.fbPixelId ?? '',
      tiktokPixelId: row.tiktokPixelId ?? '',
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao carregar' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  try {
    const body = await request.json();
    const data = {
      supportEmail: typeof body.supportEmail === 'string' ? body.supportEmail.trim() || null : null,
      adminCredentialsEmail: typeof body.adminCredentialsEmail === 'string' ? body.adminCredentialsEmail.trim() || null : null,
      whatsappNumber: typeof body.whatsappNumber === 'string' ? body.whatsappNumber.trim() || null : null,
      instagramUrl: typeof body.instagramUrl === 'string' ? body.instagramUrl.trim() || null : null,
      tiktokUrl: typeof body.tiktokUrl === 'string' ? body.tiktokUrl.trim() || null : null,
      youtubeUrl: typeof body.youtubeUrl === 'string' ? body.youtubeUrl.trim() || null : null,
      companyName: typeof body.companyName === 'string' ? body.companyName.trim() || null : null,
      companyCnpj: typeof body.companyCnpj === 'string' ? body.companyCnpj.trim() || null : null,
      gaMeasurementId: typeof body.gaMeasurementId === 'string' ? body.gaMeasurementId.trim() || null : null,
      fbPixelId: typeof body.fbPixelId === 'string' ? body.fbPixelId.trim() || null : null,
      tiktokPixelId: typeof body.tiktokPixelId === 'string' ? body.tiktokPixelId.trim() || null : null,
    };
    const existing = await prisma.siteSettings.findFirst();
    let row;
    if (existing) {
      row = await prisma.siteSettings.update({
        where: { id: existing.id },
        data,
      });
    } else {
      row = await prisma.siteSettings.create({ data });
    }
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao salvar' }, { status: 500 });
  }
}
