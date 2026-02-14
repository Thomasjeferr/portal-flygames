import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const game = await prisma.preSaleGame.findUnique({
    where: { id },
    include: { specialCategory: true, clubSlots: { orderBy: { slotIndex: 'asc' } } },
  });
  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });
  return NextResponse.json(game);
}
