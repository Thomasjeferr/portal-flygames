import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { hasFullAccess } from '@/lib/access';
import { prisma } from '@/lib/db';
import {
  CopaHero,
  CopaPremiacao,
  CopaStatusCards,
  CopaRankingLeaderboard,
  CopaConfirmedTeams,
  CopaBracket,
} from '@/components/copa';

export const dynamic = 'force-dynamic';

type Params = { slug: string };

async function getTournament(slug: string) {
  const tournament = await prisma.tournament.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      teams: {
        include: { team: { select: { id: true, name: true, shortName: true, crestUrl: true } } },
        orderBy: [{ goalCurrentSupporters: 'desc' }, { team: { name: 'asc' } }],
      },
    },
  });
  return tournament;
}

async function getTournamentMatches(tournamentId: string) {
  return prisma.tournamentMatch.findMany({
    where: { tournamentId },
    include: {
      teamA: { select: { id: true, name: true, shortName: true, crestUrl: true } },
      teamB: { select: { id: true, name: true, shortName: true, crestUrl: true } },
      winnerTeam: { select: { id: true, name: true, shortName: true } },
    },
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }],
  });
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament) return { title: 'Torneio não encontrado' };
  return {
    title: `${tournament.name} | Copa Mata-Mata`,
    description: `Ranking de ativação e times confirmados - ${tournament.name}`,
  };
}

const ROUND_LABEL: Record<number, string> = {
  32: '1ª fase (32)',
  16: 'Oitavas',
  8: 'Quartas',
  4: 'Semifinal',
  2: 'Final',
};

export default async function TorneioPublicPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const [tournament, session] = await Promise.all([getTournament(slug), getSession()]);
  if (!tournament) notFound();

  const isAlreadySubscriber = session ? await hasFullAccess(session.userId) : false;

  const matches =
    tournament.bracketStatus === 'GENERATED' ? await getTournamentMatches(tournament.id) : [];

  const t = tournament as typeof tournament & {
    premioPrimeiro?: number | null;
    premioSegundo?: number | null;
    premioTerceiro?: number | null;
    premioQuarto?: number | null;
    premiacaoTipo?: string | null;
    trofeuCampeao?: boolean;
    trofeuVice?: boolean;
    trofeuTerceiro?: boolean;
    trofeuQuarto?: boolean;
    trofeuArtilheiro?: boolean;
    craqueDaCopa?: boolean;
  };
  const premio1 = t.premioPrimeiro ?? null;
  const premio2 = t.premioSegundo ?? null;
  const premio3 = t.premioTerceiro ?? null;
  const premio4 = t.premioQuarto ?? null;
  const premiacaoTipo = t.premiacaoTipo ?? null;
  const trofeus = [
    t.trofeuCampeao && 'Campeão',
    t.trofeuVice && 'Vice-campeão',
    t.trofeuTerceiro && '3º lugar',
    t.trofeuQuarto && '4º lugar',
    t.trofeuArtilheiro && 'Artilheiro',
    t.craqueDaCopa && 'Craque da Copa',
  ].filter(Boolean) as string[];
  const hasPremiacao =
    premio1 != null || premio2 != null || premio3 != null || premio4 != null || trofeus.length > 0;

  const teamsInGoal = tournament.teams.filter(
    (tt) =>
      tt.registrationType === 'GOAL' && (tt.teamStatus === 'IN_GOAL' || tt.teamStatus === 'APPLIED')
  );
  const teamsConfirmed = tournament.teams.filter((tt) => tt.teamStatus === 'CONFIRMED');
  const goalRequired = tournament.goalRequiredSupporters ?? 0;
  const goalPrice = tournament.goalPricePerSupporter ?? 0;
  const isGoalMode = tournament.registrationMode === 'GOAL';
  const confirmedCount = teamsConfirmed.length;
  const leaderTeam =
    teamsInGoal.length > 0 && teamsInGoal[0].goalCurrentSupporters > 0
      ? {
          name: teamsInGoal[0].team.name,
          supporters: teamsInGoal[0].goalCurrentSupporters,
        }
      : null;

  return (
    <div className="min-h-screen bg-futvar-darker scroll-smooth">
      <CopaHero
        name={tournament.name}
        season={tournament.season}
        maxTeams={tournament.maxTeams}
        confirmedCount={confirmedCount}
        goalRequired={goalRequired}
        goalPrice={goalPrice}
        isGoalMode={isGoalMode}
        slug={slug}
        isAlreadySubscriber={isAlreadySubscriber}
      />

      {hasPremiacao && (
        <CopaPremiacao
          premiacaoTipo={premiacaoTipo}
          premio1={premio1}
          premio2={premio2}
          premio3={premio3}
          premio4={premio4}
          trofeus={trofeus}
        />
      )}

      <CopaStatusCards
        confirmedCount={confirmedCount}
        maxTeams={tournament.maxTeams}
        goalEndAt={tournament.goalEndAt}
        goalStartAt={tournament.goalStartAt}
        leaderTeam={leaderTeam}
        isGoalMode={isGoalMode}
      />

      {isGoalMode && (
        <CopaRankingLeaderboard
          teams={teamsInGoal.map((tt) => ({
            teamId: tt.teamId,
            goalCurrentSupporters: tt.goalCurrentSupporters,
            goalAchievedAt: tt.goalAchievedAt,
            team: tt.team,
          }))}
          goalRequired={goalRequired}
          goalPrice={goalPrice}
          slug={slug}
          isAlreadySubscriber={isAlreadySubscriber}
        />
      )}

      <CopaConfirmedTeams
        teams={teamsConfirmed.map((tt) => ({
          teamId: tt.teamId,
          goalCurrentSupporters: tt.goalCurrentSupporters,
          goalAchievedAt: tt.goalAchievedAt,
          team: tt.team,
        }))}
      />

      <CopaBracket
        matches={matches.map((m) => ({
          id: m.id,
          round: m.round,
          matchNumber: m.matchNumber,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          scoreA: m.scoreA,
          scoreB: m.scoreB,
          penaltiesA: m.penaltiesA,
          penaltiesB: m.penaltiesB,
          status: m.status,
          scheduledAt: m.scheduledAt,
          teamA: m.teamA,
          teamB: m.teamB,
          winnerTeam: m.winnerTeam,
        }))}
        roundLabel={ROUND_LABEL}
      />

      {!isGoalMode && tournament.registrationMode === 'PAID' && (
        <section className="px-4 lg:px-12 py-8">
          <div className="max-w-5xl mx-auto">
            <p className="text-futvar-light text-sm">
              Este torneio tem inscrição paga. Acompanhe os times confirmados acima.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
