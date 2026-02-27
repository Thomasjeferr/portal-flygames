import { prisma } from '@/lib/db';

/** Tamanhos de chave suportados (mata-mata: potências de 2 entre 2 e 32). */
const SUPPORTED_SIZES = [2, 4, 8, 16, 32];

/**
 * Retorna as rodadas do mata-mata para um dado número de times.
 * Ex.: 32 → [2, 4, 8, 16, 32]; 16 → [2, 4, 8, 16]; 8 → [2, 4, 8].
 */
function getRoundsForSize(maxTeams: number): number[] {
  const rounds: number[] = [];
  let r = 2;
  while (r <= maxTeams) {
    rounds.push(r);
    r *= 2;
  }
  return rounds;
}

/**
 * Embaralha array (Fisher-Yates).
 */
function shuffle<T>(array: T[]): T[] {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Gera a chave mata-mata (tournament_matches) para torneio com N times confirmados.
 * Suporta 2, 4, 8, 16 ou 32 times (conforme max_teams do torneio).
 * - Cria os jogos de cada rodada (final até 1ª fase); na primeira rodada (igual a maxTeams) preenche os confrontos com sorteio.
 * - nextMatchId: vencedor do jogo k vai para o jogo ceil(k/2) da rodada seguinte.
 */
export async function generateBracket(tournamentId: string): Promise<{ ok: boolean; error?: string }> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) return { ok: false, error: 'Torneio não encontrado' };
  if (tournament.bracketStatus === 'GENERATED') {
    return { ok: false, error: 'Chaveamento já foi gerado. Exclua as partidas antes de gerar novamente.' };
  }
  const maxTeams = tournament.maxTeams;
  if (!SUPPORTED_SIZES.includes(maxTeams)) {
    return {
      ok: false,
      error: `Geração de chave suporta apenas 2, 4, 8, 16 ou 32 times. Este torneio está com ${maxTeams}.`,
    };
  }

  const confirmed = await prisma.tournamentTeam.findMany({
    where: { tournamentId, teamStatus: 'CONFIRMED' },
    select: { teamId: true },
    take: maxTeams,
  });
  if (confirmed.length < maxTeams) {
    return {
      ok: false,
      error: `É necessário ${maxTeams} times confirmados. Atualmente: ${confirmed.length}.`,
    };
  }

  const teamIds = shuffle(confirmed.map((c) => c.teamId));
  const idByRoundMatch: Record<string, string> = {};
  const rounds = getRoundsForSize(maxTeams);

  for (const round of rounds) {
    const count = round / 2; // 2→1, 4→2, 8→4, 16→8, 32→16
    const isFirstRound = round === maxTeams; // rodada com confrontos definidos pelo sorteio
    for (let matchNum = 1; matchNum <= count; matchNum++) {
      const teamAId = isFirstRound ? teamIds[(matchNum - 1) * 2] ?? null : null;
      const teamBId = isFirstRound ? teamIds[(matchNum - 1) * 2 + 1] ?? null : null;
      const nextMatchNum = Math.ceil(matchNum / 2);
      const nextRound = round > 2 ? round / 2 : null;
      const nextMatchId = nextRound ? idByRoundMatch[`${nextRound}_${nextMatchNum}`] ?? null : null;

      const created = await prisma.tournamentMatch.create({
        data: {
          tournamentId,
          round,
          matchNumber: matchNum,
          ...(teamAId && { teamAId }),
          ...(teamBId && { teamBId }),
          ...(nextMatchId && { nextMatchId }),
          status: 'SCHEDULED',
        },
      });
      idByRoundMatch[`${round}_${matchNum}`] = created.id;
    }
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { bracketStatus: 'GENERATED' },
  });

  return { ok: true };
}

/**
 * Calcula o vencedor a partir de placar e, se empate, pênaltis.
 * Retorna teamAId, teamBId ou null (indefinido).
 */
function computeWinner(
  teamAId: string | null,
  teamBId: string | null,
  scoreA: number,
  scoreB: number,
  penaltiesA: number | null,
  penaltiesB: number | null
): string | null {
  if (scoreA > scoreB) return teamAId;
  if (scoreB > scoreA) return teamBId;
  if (penaltiesA != null && penaltiesB != null) {
    if (penaltiesA > penaltiesB) return teamAId;
    if (penaltiesB > penaltiesA) return teamBId;
  }
  return null;
}

/**
 * Salva resultado de uma partida, calcula o vencedor e avança para o próximo jogo.
 * Convenção: jogo ímpar (1, 3, 5...) alimenta teamA do próximo; jogo par (2, 4, 6...) alimenta teamB.
 */
export async function saveMatchResult(
  tournamentId: string,
  matchId: string,
  data: { scoreA: number; scoreB: number; penaltiesA?: number | null; penaltiesB?: number | null }
): Promise<{ ok: boolean; error?: string }> {
  const match = await prisma.tournamentMatch.findFirst({
    where: { id: matchId, tournamentId },
    include: { nextMatch: true },
  });
  if (!match) return { ok: false, error: 'Partida não encontrada' };
  if (match.status === 'FINISHED') return { ok: false, error: 'Partida já finalizada' };
  if (match.teamAId == null && match.teamBId == null) {
    return { ok: false, error: 'Partida ainda não tem times definidos' };
  }

  const { scoreA, scoreB, penaltiesA = null, penaltiesB = null } = data;
  const winnerTeamId = computeWinner(
    match.teamAId,
    match.teamBId,
    scoreA,
    scoreB,
    penaltiesA,
    penaltiesB
  );
  if (winnerTeamId == null) {
    return { ok: false, error: 'Empate no tempo normal. Informe pênaltis para definir o vencedor.' };
  }

  await prisma.tournamentMatch.update({
    where: { id: matchId },
    data: {
      scoreA,
      scoreB,
      penaltiesA: penaltiesA ?? undefined,
      penaltiesB: penaltiesB ?? undefined,
      winnerTeamId,
      status: 'FINISHED',
    },
  });

  if (match.nextMatchId && match.nextMatch) {
    const slotA = match.matchNumber % 2 === 1; // 1, 3, 5... → teamA do próximo
    await prisma.tournamentMatch.update({
      where: { id: match.nextMatchId },
      data: slotA ? { teamAId: winnerTeamId } : { teamBId: winnerTeamId },
    });
  }

  return { ok: true };
}
