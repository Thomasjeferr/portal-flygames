import { NextRequest, NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';
import { getTeamRosterForTournament } from '@/lib/tournamentElenco';

/**
 * GET /api/team-portal/teams/[id]/tournaments/[tournamentId]/elenco
 * Retorna o elenco do time neste campeonato: snapshot enviado (se houver) ou lista atual.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; tournamentId: string }> }
) {
  const { id: teamId, tournamentId } = await params;
  const hasAccess = await getTeamAccess(teamId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Acesso negado a este time' }, { status: 403 });
  }

  const enrollment = await prisma.tournamentTeam.findUnique({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    select: { id: true },
  });
  if (!enrollment) {
    return NextResponse.json({ error: 'Time não está inscrito neste torneio' }, { status: 404 });
  }

  const { members, source } = await getTeamRosterForTournament(teamId, tournamentId);
  return NextResponse.json({ members, source });
}
