import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessGameBySlug } from '@/lib/access';

/** GET /api/games/[gameId] – retorna jogo por id ou slug (compatível com chamadas por slug). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const idOrSlug = (await params).gameId;
  const game = await prisma.game.findUnique({ where: { id: idOrSlug } })
    ?? await prisma.game.findUnique({ where: { slug: idOrSlug } });
  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });

  const session = await getSession();
  const canWatch = session ? await canAccessGameBySlug(session.userId, game.slug) : false;

  return NextResponse.json({
    ...game,
    gameDate: game.gameDate.toISOString(),
    canWatch,
    videoUrl: canWatch ? game.videoUrl : null,
  });
}
