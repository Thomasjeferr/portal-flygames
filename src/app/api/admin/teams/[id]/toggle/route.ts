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
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });
    const updated = await prisma.team.update({
      where: { id },
      data: { isActive: !team.isActive },
    });
    revalidatePath('/');
    return NextResponse.json(updated);
  } catch (e) {
    console.error('POST /api/admin/teams/[id]/toggle', e);
    return NextResponse.json({ error: 'Erro ao alternar status' }, { status: 500 });
  }
}
