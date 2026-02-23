import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const MAX_ITEMS = 6;

/**
 * GET — lista os últimos jogos com progresso (Continuar assistindo).
 * Ordenado por updatedAt desc (mais recente primeiro). Máximo 6 itens.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ items: [] });
  }

  const progressList = await prisma.watchProgress.findMany({
    where: { userId: session.userId },
    orderBy: { updatedAt: 'desc' },
    take: MAX_ITEMS,
    include: {
      game: {
        select: {
          id: true,
          title: true,
          slug: true,
          thumbnailUrl: true,
          championship: true,
        },
      },
    },
  });

  const items = progressList.map((p) => ({
    gameId: p.gameId,
    title: p.game.title,
    slug: p.game.slug,
    thumbnailUrl: p.game.thumbnailUrl,
    championship: p.game.championship,
    positionSeconds: p.positionSeconds,
    durationSeconds: p.durationSeconds ?? undefined,
    updatedAt: p.updatedAt.toISOString(),
  }));

  return NextResponse.json({ items });
}
