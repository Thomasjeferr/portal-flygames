import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const games = await prisma.game.findMany({
    orderBy: [{ featured: 'desc' }, { gameDate: 'desc' }],
    select: {
      id: true,
      title: true,
      slug: true,
      championship: true,
      gameDate: true,
      thumbnailUrl: true,
      featured: true,
    },
  });
  return NextResponse.json(
    games.map((g) => ({
      ...g,
      gameDate: g.gameDate.toISOString(),
    }))
  );
}
