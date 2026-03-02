import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTeamRosterForTournament } from '@/lib/tournamentElenco';

/**
 * GET /api/admin/tournaments/[id]/teams/[teamId]/elenco
 * Retorna o elenco do time neste campeonato (snapshot enviado ou lista atual). Apenas admin.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const tournamentId = (await params).id;
  const teamId = (await params).teamId;

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
