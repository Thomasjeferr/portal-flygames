import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessGameBySlug } from '@/lib/access';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug;
  const game = await prisma.game.findUnique({ where: { slug } });
  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });

  const session = await getSession();
  const canWatch = session ? await canAccessGameBySlug(session.userId, slug) : false;

  return NextResponse.json({
    ...game,
    gameDate: game.gameDate.toISOString(),
    canWatch,
    videoUrl: canWatch ? game.videoUrl : null,
  });
}
