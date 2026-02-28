import { NextRequest, NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/team-portal/teams/[id]/tournaments
 * Lista campeonatos publicados para o time: disponíveis (não inscrito) e em que já está inscrito.
 * Usuário deve ter acesso ao time (TeamManager).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const teamId = (await params).id;
  const hasAccess = await getTeamAccess(teamId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Acesso negado a este time' }, { status: 403 });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, approvalStatus: true },
  });
  if (!team) {
    return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });
  }

  const tournaments = await prisma.tournament.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      slug: true,
      season: true,
      region: true,
      maxTeams: true,
      registrationMode: true,
      registrationFeeAmount: true,
      goalRequiredSupporters: true,
      goalPricePerSupporter: true,
      goalStartAt: true,
      goalEndAt: true,
      premiacaoTipo: true,
      premioPrimeiro: true,
      premioSegundo: true,
      premioTerceiro: true,
      premioQuarto: true,
      trofeuCampeao: true,
      trofeuVice: true,
      trofeuTerceiro: true,
      trofeuQuarto: true,
      trofeuArtilheiro: true,
      craqueDaCopa: true,
      regulamentoUrl: true,
      regulamentoTexto: true,
      teams: {
        where: { teamId },
        select: {
          id: true,
          teamStatus: true,
          paymentStatus: true,
          registrationType: true,
          goalStatus: true,
          goalCurrentSupporters: true,
        },
      },
    },
  });

  const tournamentIds = tournaments.map((t) => t.id);
  const counts = await prisma.tournamentTeam.groupBy({
    by: ['tournamentId'],
    where: {
      tournamentId: { in: tournamentIds },
      teamStatus: { in: ['APPLIED', 'IN_GOAL', 'CONFIRMED'] },
    },
    _count: { id: true },
  });
  const countByTournament = Object.fromEntries(
    counts.map((c) => [c.tournamentId, c._count.id])
  );

  const teamApproved = team.approvalStatus === 'approved';

  const list = tournaments.map((t) => {
    const enrollment = t.teams[0] ?? null;
    const enrolledCount = countByTournament[t.id] ?? 0;
    const spotsLeft = Math.max(0, t.maxTeams - enrolledCount);
    const canEnroll = teamApproved && !enrollment && spotsLeft > 0;
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      season: t.season,
      region: t.region,
      maxTeams: t.maxTeams,
      registrationMode: t.registrationMode,
      registrationFeeAmount: t.registrationFeeAmount,
      goalRequiredSupporters: t.goalRequiredSupporters,
      goalPricePerSupporter: t.goalPricePerSupporter,
      goalStartAt: t.goalStartAt,
      goalEndAt: t.goalEndAt,
      premiacaoTipo: t.premiacaoTipo,
      premioPrimeiro: t.premioPrimeiro,
      premioSegundo: t.premioSegundo,
      premioTerceiro: t.premioTerceiro,
      premioQuarto: t.premioQuarto,
      trofeuCampeao: t.trofeuCampeao,
      trofeuVice: t.trofeuVice,
      trofeuTerceiro: t.trofeuTerceiro,
      trofeuQuarto: t.trofeuQuarto,
      trofeuArtilheiro: t.trofeuArtilheiro,
      craqueDaCopa: t.craqueDaCopa,
      regulamentoUrl: t.regulamentoUrl,
      regulamentoTexto: t.regulamentoTexto,
      enrolled: !!enrollment,
      enrollment: enrollment
        ? {
            id: enrollment.id,
            teamStatus: enrollment.teamStatus,
            paymentStatus: enrollment.paymentStatus,
            registrationType: enrollment.registrationType,
            goalStatus: enrollment.goalStatus,
            goalCurrentSupporters: enrollment.goalCurrentSupporters,
          }
        : null,
      canEnroll,
      spotsLeft,
    };
  });

  return NextResponse.json({ tournaments: list, teamApproved });
}
