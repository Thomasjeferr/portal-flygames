import { NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/team-portal/teams/[id]/games/[gameId]
 * Detalhe do jogo para súmula: dados do jogo, stats por jogador, aprovações (para exibir motivo de rejeição do outro time).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; gameId: string }> }
) {
  const { id: teamId, gameId } = await params;
  const hasAccess = await getTeamAccess(teamId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const game = await prisma.game.findFirst({
    where: {
      id: gameId,
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      championship: true,
      gameDate: true,
      description: true,
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
      playerMatchStats: {
        include: { teamMember: { select: { id: true, name: true, number: true, position: true } } },
      },
      sumulaApprovals: { select: { teamId: true, status: true, rejectionReason: true, rejectedAt: true, approvedAt: true } },
    },
  });

  if (!game) {
    return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });
  }

  const myApproval = game.sumulaApprovals.find((a) => a.teamId === teamId);
  const otherApproval = game.sumulaApprovals.find((a) => a.teamId !== teamId);
  const bothApproved =
    game.sumulaApprovals.length === 2 &&
    game.sumulaApprovals.every((a) => a.status === 'APROVADA');

  const homeStats = game.playerMatchStats
    .filter((s) => s.teamId === game.homeTeamId)
    .map((s) => ({
      teamMemberId: s.teamMemberId,
      name: s.teamMember.name,
      number: s.teamMember.number,
      position: s.teamMember.position,
      goals: s.goals,
      assists: s.assists,
      fouls: s.fouls,
      yellowCard: s.yellowCard,
      redCard: s.redCard,
      highlight: s.highlight,
    }));
  const awayStats = game.playerMatchStats
    .filter((s) => s.teamId === game.awayTeamId)
    .map((s) => ({
      teamMemberId: s.teamMemberId,
      name: s.teamMember.name,
      number: s.teamMember.number,
      position: s.teamMember.position,
      goals: s.goals,
      assists: s.assists,
      fouls: s.fouls,
      yellowCard: s.yellowCard,
      redCard: s.redCard,
      highlight: s.highlight,
    }));

  return NextResponse.json({
    id: game.id,
    title: game.title,
    slug: game.slug,
    championship: game.championship,
    gameDate: game.gameDate.toISOString(),
    description: game.description,
    thumbnailUrl: game.thumbnailUrl,
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    venue: game.venue,
    referee: game.referee,
    sumulaPublishedAt: game.sumulaPublishedAt?.toISOString() ?? null,
    homeTeamId: game.homeTeamId,
    awayTeamId: game.awayTeamId,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    homeStats,
    awayStats,
    myApprovalStatus: myApproval?.status ?? null,
    myRejectionReason: myApproval?.rejectionReason ?? null,
    otherTeamRejectionReason: otherApproval?.status === 'REJEITADA' ? otherApproval.rejectionReason : null,
    otherTeamApproved: otherApproval?.status === 'APROVADA',
    bothApproved,
  });
}
