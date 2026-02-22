import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/sumulas/games
 * Lista jogos com status da súmula (publicada, aprovações) para o admin.
 */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const games = await prisma.game.findMany({
    orderBy: [{ gameDate: 'desc' }],
    include: {
      homeTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
      awayTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
      sumulaApprovals: { select: { teamId: true, status: true, rejectionReason: true, rejectedAt: true, approvedAt: true } },
    },
  });

  return NextResponse.json(
    games.map((g) => ({
      id: g.id,
      title: g.title,
      slug: g.slug,
      championship: g.championship,
      gameDate: g.gameDate.toISOString(),
      homeScore: g.homeScore,
      awayScore: g.awayScore,
      homeTeamId: g.homeTeamId,
      awayTeamId: g.awayTeamId,
      sumulaPublishedAt: g.sumulaPublishedAt?.toISOString() ?? null,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      sumulaApprovals: g.sumulaApprovals,
    }))
  );
}
