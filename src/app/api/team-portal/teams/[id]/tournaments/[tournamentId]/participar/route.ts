import { NextRequest, NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';

/**
 * POST /api/team-portal/teams/[id]/tournaments/[tournamentId]/participar
 * Inscreve o time no campeonato (cria TournamentTeam).
 * FREE → CONFIRMED; PAID → APPLIED (depois paga); GOAL → IN_GOAL.
 * Retorna needsPayment: true para PAID (front redireciona para checkout).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; tournamentId: string }> }
) {
  const { id: teamId, tournamentId } = await params;

  const hasAccess = await getTeamAccess(teamId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Acesso negado a este time' }, { status: 403 });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, approvalStatus: true },
  });
  if (!team) {
    return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });
  }
  if (team.approvalStatus !== 'approved') {
    return NextResponse.json(
      { error: 'Apenas times aprovados podem se inscrever em campeonatos' },
      { status: 400 }
    );
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) {
    return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
  }
  if (tournament.status !== 'PUBLISHED') {
    return NextResponse.json(
      { error: 'Este campeonato não está com inscrições abertas' },
      { status: 400 }
    );
  }

  const existing = await prisma.tournamentTeam.findUnique({
    where: { tournamentId_teamId: { tournamentId, teamId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'Este time já está inscrito neste campeonato' },
      { status: 400 }
    );
  }

  const enrolledCount = await prisma.tournamentTeam.count({
    where: {
      tournamentId,
      teamStatus: { in: ['APPLIED', 'IN_GOAL', 'CONFIRMED'] },
    },
  });
  if (enrolledCount >= tournament.maxTeams) {
    return NextResponse.json(
      { error: 'As vagas deste campeonato já foram preenchidas' },
      { status: 400 }
    );
  }

  const mode = tournament.registrationMode;
  const teamStatus =
    mode === 'FREE' ? 'CONFIRMED' : mode === 'PAID' ? 'APPLIED' : 'IN_GOAL';
  const goalStatus = mode === 'GOAL' ? 'PENDING' : null;
  const goalPayoutPercent = 0;

  const created = await prisma.tournamentTeam.create({
    data: {
      tournamentId,
      teamId,
      registrationType: mode,
      teamStatus,
      goalStatus,
      goalPayoutPercent,
    },
    include: { tournament: true, team: true },
  });

  const needsPayment =
    mode === 'PAID' &&
    (tournament.registrationFeeAmount ?? 0) > 0;

  return NextResponse.json({
    tournamentTeam: {
      id: created.id,
      teamStatus: created.teamStatus,
      paymentStatus: created.paymentStatus,
      registrationType: created.registrationType,
    },
    needsPayment,
    slug: tournament.slug,
    message: needsPayment
      ? 'Inscrição realizada. Realize o pagamento para confirmar.'
      : 'Inscrição realizada com sucesso.',
  });
}
