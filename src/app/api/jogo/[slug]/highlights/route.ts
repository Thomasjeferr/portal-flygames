import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/jogo/[slug]/highlights
 * Lista os cortes (melhores momentos) do jogo para exibição na página pública.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug;
  if (!slug) return NextResponse.json({ error: 'Slug obrigatório' }, { status: 400 });

  const game = await prisma.game.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!game) return NextResponse.json({ highlights: [] });

  const highlights = await prisma.gameHighlight.findMany({
    where: { gameId: game.id },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      title: true,
      description: true,
      videoUrl: true,
      thumbnailUrl: true,
      durationSec: true,
      order: true,
    },
  });

  return NextResponse.json({ highlights });
}
