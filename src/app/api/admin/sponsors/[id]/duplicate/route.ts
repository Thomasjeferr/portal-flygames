import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const id = (await params).id;
  try {
    const original = await prisma.sponsor.findUnique({ where: { id } });
    if (!original) return NextResponse.json({ error: 'Patrocinador não encontrado' }, { status: 404 });
    const copy = await prisma.sponsor.create({
      data: {
        name: `${original.name} (cópia)`,
        websiteUrl: original.websiteUrl,
        logoUrl: original.logoUrl,
        tier: original.tier,
        priority: original.priority,
        isActive: false,
        startAt: original.startAt,
        endAt: original.endAt,
        planId: original.planId,
      },
    });
    revalidatePath('/');
    return NextResponse.json(copy);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao duplicar' }, { status: 500 });
  }
}
