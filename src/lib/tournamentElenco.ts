import { prisma } from '@/lib/db';

export type TournamentRosterMember = {
  id: string;
  name: string;
  number: number | null;
  position: string | null;
  role: string;
  photoUrl: string | null;
};

/**
 * Retorna o elenco do time no contexto do campeonato.
 * Se o time enviou o elenco (TournamentTeamElenco), retorna esse snapshot;
 * senão retorna a lista atual de TeamMember (ativos).
 */
export async function getTeamRosterForTournament(
  teamId: string,
  tournamentId: string
): Promise<{ members: TournamentRosterMember[]; source: 'submitted' | 'current' }> {
  const enrollment = await prisma.tournamentTeam.findUnique({
    where: {
      tournamentId_teamId: { tournamentId, teamId },
    },
    select: {
      id: true,
      elencoSubmittedAt: true,
      elencoEntries: {
        include: {
          teamMember: {
            select: { id: true, name: true, number: true, position: true, role: true, photoUrl: true },
          },
        },
      },
    },
  });

  if (enrollment?.elencoSubmittedAt && enrollment.elencoEntries.length > 0) {
    const members: TournamentRosterMember[] = enrollment.elencoEntries.map((e) => ({
      id: e.teamMember.id,
      name: e.teamMember.name,
      number: e.teamMember.number,
      position: e.teamMember.position,
      role: e.teamMember.role,
      photoUrl: e.teamMember.photoUrl,
    }));
    return { members, source: 'submitted' };
  }

  const current = await prisma.teamMember.findMany({
    where: { teamId, isActive: true },
    orderBy: [{ number: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, number: true, position: true, role: true, photoUrl: true },
  });
  return {
    members: current.map((m) => ({
      id: m.id,
      name: m.name,
      number: m.number,
      position: m.position,
      role: m.role,
      photoUrl: m.photoUrl,
    })),
    source: 'current',
  };
}
