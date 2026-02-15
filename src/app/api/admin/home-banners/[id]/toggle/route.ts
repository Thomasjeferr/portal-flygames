import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 });
  }
  const id = (await params).id;
  try {
    const banner = await prisma.homeBanner.findUnique({ where: { id } });
    if (!banner) return NextResponse.json({ error: 'Banner nao encontrado' }, { status: 404 });

    const updated = await prisma.homeBanner.update({
      where: { id },
      data: { isActive: !banner.isActive },
      include: { game: true, preSale: true },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao alternar' }, { status: 500 });
  }
}
