import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 });
  const id = (await params).id;
  try {
    const orig = await prisma.homeBanner.findUnique({ where: { id } });
    if (!orig) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
    const { id: _id, createdAt, updatedAt, ...data } = orig;
    const banner = await prisma.homeBanner.create({
      data: { ...data, headline: orig.headline ? `${orig.headline} (copia)` : '(copia)' },
      include: { game: true, preSale: true },
    });
    revalidatePath('/');
    return NextResponse.json(banner);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao duplicar' }, { status: 500 });
  }
}
