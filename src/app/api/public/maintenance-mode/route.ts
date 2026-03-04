import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** Retorna se a página "Site em desenvolvimento" está ativa. Usado pelo middleware. Sem auth. */
export async function GET() {
  try {
    const row = await prisma.siteSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { siteUnderDevelopment: true },
    });
    return NextResponse.json({ enabled: row?.siteUnderDevelopment ?? false });
  } catch {
    return NextResponse.json({ enabled: false });
  }
}
