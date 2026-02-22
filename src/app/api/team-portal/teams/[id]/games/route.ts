import { NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/team-portal/teams/[id]/games
 * Lista jogos em que o time participa (mandante ou visitante).
 * Só retorna dados necessários para lista e súmula; time só vê o que existe.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const teamId = (await params).id;
  const hasAccess = await getTeamAccess(teamId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const games = await prisma.game.findMany({
    where: {
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    orderBy: { gameDate: 'desc' },
    select: {
      id: true,
      title: true,
      slug: true,
      championship: true,
      gameDate: true,
      thumbnailUrl: true,
      homeScore: true,
      awayScore: true,
      venue: true,
      referee: true,
      homeTeamId: true,
      awayTeamId: true,
      sumulaPublishedAt: true,
      homeTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
      awayTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
      sumulaApprovals: { select: { teamId: true, status: true } },
    },
  });

  return NextResponse.json(
    games.map((g) => {
      const myApproval = g.sumulaApprovals.find((a) => a.teamId === teamId);
      return {
        id: g.id,
        title: g.title,
        slug: g.slug,
        championship: g.championship,
        gameDate: g.gameDate.toISOString(),
        thumbnailUrl: g.thumbnailUrl,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        venue: g.venue,
        referee: g.referee,
        homeTeamId: g.homeTeamId,
        awayTeamId: g.awayTeamId,
        sumulaPublishedAt: g.sumulaPublishedAt?.toISOString() ?? null,
        homeTeam: g.homeTeam,
        awayTeam: g.awayTeam,
        myApprovalStatus: myApproval?.status ?? null,
      };
    })
  );
}
