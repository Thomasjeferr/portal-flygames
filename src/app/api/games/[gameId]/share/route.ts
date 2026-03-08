import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/** POST /api/games/[gameId]/share – registra um compartilhamento (incrementa contador). */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  if (!gameId) return NextResponse.json({ error: 'gameId obrigatório' }, { status: 400 });
  try {
    await prisma.game.update({
      where: { id: gameId },
      data: { shareCount: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });
  }
}
