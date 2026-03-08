import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** GET /api/games/[gameId]/likes – retorna contagem e se o usuário logado curtiu. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    if (!gameId) return NextResponse.json({ error: 'gameId obrigatório' }, { status: 400 });
    const session = await getSession();
    const [count, userLike] = await Promise.all([
      prisma.gameLike.count({ where: { gameId } }),
      session
        ? prisma.gameLike.findUnique({
            where: { gameId_userId: { gameId, userId: session.userId } },
            select: { id: true },
          })
        : null,
    ]);
    return NextResponse.json({ count, userLiked: !!userLike });
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar curtidas' }, { status: 500 });
  }
}

/** POST /api/games/[gameId]/likes – toggle curtida (exige login). */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Faça login para curtir' }, { status: 401 });
    const { gameId } = await params;
    if (!gameId) return NextResponse.json({ error: 'gameId obrigatório' }, { status: 400 });
    const game = await prisma.game.findUnique({ where: { id: gameId }, select: { id: true } });
    if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });
    const existing = await prisma.gameLike.findUnique({
      where: { gameId_userId: { gameId, userId: session.userId } },
    });
    if (existing) {
      await prisma.gameLike.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    }
    await prisma.gameLike.create({
      data: { gameId, userId: session.userId },
    });
    return NextResponse.json({ liked: true });
  } catch (e) {
    const message = process.env.NODE_ENV === 'development' && e instanceof Error ? e.message : 'Erro ao processar curtida';
    if (process.env.NODE_ENV === 'development') console.error('[POST /api/games/.../likes]', e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
