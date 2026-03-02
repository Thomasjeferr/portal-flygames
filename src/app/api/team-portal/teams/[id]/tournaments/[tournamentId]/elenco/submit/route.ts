import { NextRequest, NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';

/**
 * POST /api/team-portal/teams/[id]/tournaments/[tournamentId]/elenco/submit
 * Envia o elenco do time para o campeonato (trava e grava snapshot em TournamentTeamElenco).
 * Apenas para times CONFIRMED; não pode enviar se já enviou ou se passou o prazo.
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

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      elencoDeadlineAt: true,
      teams: {
        where: { teamId },
        select: {
          id: true,
          teamStatus: true,
          elencoSubmittedAt: true,
        },
      },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: 'Torneio não encontrado' }, { status: 404 });
  }

  const enrollment = tournament.teams[0] ?? null;
  if (!enrollment) {
    return NextResponse.json({ error: 'Time não está inscrito neste torneio' }, { status: 400 });
  }
  if (enrollment.teamStatus !== 'CONFIRMED') {
    return NextResponse.json({ error: 'Apenas times confirmados podem enviar o elenco' }, { status: 400 });
  }
  if (enrollment.elencoSubmittedAt) {
    return NextResponse.json({ error: 'Elenco já foi enviado para este campeonato' }, { status: 400 });
  }

  const now = new Date();
  if (tournament.elencoDeadlineAt && now > tournament.elencoDeadlineAt) {
    return NextResponse.json({ error: 'Prazo para envio do elenco já passou' }, { status: 400 });
  }

  const currentMembers = await prisma.teamMember.findMany({
    where: { teamId, isActive: true },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.tournamentTeam.update({
      where: { id: enrollment.id },
      data: { elencoSubmittedAt: now },
    });
    await tx.tournamentTeamElenco.deleteMany({
      where: { tournamentTeamId: enrollment.id },
    });
    for (const m of currentMembers) {
      await tx.tournamentTeamElenco.create({
        data: {
          tournamentTeamId: enrollment.id,
          teamMemberId: m.id,
        },
      });
    }
  });

  return NextResponse.json({
    ok: true,
    message: 'Elenco enviado com sucesso.',
    submittedAt: now.toISOString(),
  });
}
