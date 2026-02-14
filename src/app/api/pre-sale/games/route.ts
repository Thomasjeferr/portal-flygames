import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');
  if (slug) {
    const game = await prisma.preSaleGame.findUnique({
      where: { slug },
      include: { specialCategory: true, clubSlots: { orderBy: { slotIndex: 'asc' } } },
    });
    if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });
    return NextResponse.json(game);
  }
  const special = searchParams.get('special') === '1';
  const published = searchParams.get('published') === '1';
  const where: Record<string, unknown> = {};
  if (special) where.status = { in: ['PRE_SALE', 'FUNDED'] };
  if (published) {
    where.status = 'PUBLISHED';
    where.videoUrl = { not: null };
  }
  const games = await prisma.preSaleGame.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    include: { specialCategory: true },
  });
  return NextResponse.json(games);
}
