import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/admin/tournaments/[id]/matches
 * Lista partidas da chave do torneio (por rodada).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const tournamentId = (await params).id;
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, bracketStatus: true },
  });
  if (!tournament) return NextResponse.json({ error: 'Torneio não encontrado' }, { status: 404 });

  const matches = await prisma.tournamentMatch.findMany({
    where: { tournamentId },
    include: {
      teamA: { select: { id: true, name: true, shortName: true, crestUrl: true } },
      teamB: { select: { id: true, name: true, shortName: true, crestUrl: true } },
      winnerTeam: { select: { id: true, name: true, shortName: true } },
    },
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
  });

  return NextResponse.json({ matches, bracketStatus: tournament.bracketStatus });
}
