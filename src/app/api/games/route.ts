import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const games = await prisma.game.findMany({
    orderBy: [{ order: 'asc' }, { featured: 'desc' }, { gameDate: 'desc' }],
    select: {
      id: true,
      title: true,
      slug: true,
      championship: true,
      gameDate: true,
      thumbnailUrl: true,
      featured: true,
      categoryId: true,
      category: { select: { id: true, name: true, slug: true, order: true } },
    },
  });
  return NextResponse.json(
    games.map((g) => ({
      ...g,
      gameDate: g.gameDate.toISOString(),
      category: g.category ? { id: g.category.id, name: g.category.name, slug: g.category.slug, order: g.category.order } : null,
    }))
  );
}
