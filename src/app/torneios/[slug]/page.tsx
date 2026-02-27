import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';

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
      teamA: { select: { id: true, name: true, shortName: true } },
      teamB: { select: { id: true, name: true, shortName: true } },
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

export default async function TorneioPublicPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const tournament = await getTournament(slug);
  if (!tournament) notFound();

  const matches = tournament.bracketStatus === 'GENERATED'
    ? await getTournamentMatches(tournament.id)
    : [];

  const teamsInGoal = tournament.teams.filter(
    (tt) => tt.registrationType === 'GOAL' && (tt.teamStatus === 'IN_GOAL' || tt.teamStatus === 'APPLIED')
  );
  const teamsConfirmed = tournament.teams.filter((tt) => tt.teamStatus === 'CONFIRMED');
  const goalRequired = tournament.goalRequiredSupporters ?? 0;
  const goalPrice = tournament.goalPricePerSupporter ?? 0;
  const isGoalMode = tournament.registrationMode === 'GOAL';
  const roundLabel: Record<number, string> = {
    32: '1ª fase (32)',
    16: 'Oitavas',
    8: 'Quartas',
    4: 'Semifinal',
    2: 'Final',
  };

  return (
    <div className="pt-24 pb-16 px-4 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex gap-2">
            ← Voltar ao início
          </Link>
        </div>

        <header className="mb-10">
          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">{tournament.name}</h1>
          {tournament.season && (
            <p className="text-futvar-light">{tournament.season}</p>
          )}
          <p className="text-futvar-light text-sm mt-1">
            {tournament.teams.length} / {tournament.maxTeams} times
          </p>
        </header>

        {isGoalMode && teamsInGoal.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold text-white mb-4">Ranking de ativação</h2>
            <p className="text-futvar-light text-sm mb-4">
              Apoie um time com assinatura mensal de{' '}
              <strong className="text-futvar-green">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goalPrice)}
              </strong>
              /mês. Quando o time atingir {goalRequired} apoiadores, ele é confirmado na copa.
            </p>
            <div className="space-y-3">
              {teamsInGoal.map((tt, index) => (
                <div
                  key={tt.teamId}
                  className="flex flex-wrap items-center gap-4 bg-futvar-dark border border-futvar-green/20 rounded-xl p-4"
                >
                  <span className="text-futvar-light font-bold w-6">#{index + 1}</span>
                  {tt.team.crestUrl && (
                    <img src={tt.team.crestUrl} alt="" className="w-10 h-10 object-contain" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{tt.team.name}</p>
                    <p className="text-sm text-futvar-light">
                      {tt.goalCurrentSupporters} / {goalRequired} apoiadores
                    </p>
                  </div>
                  <div className="w-full sm:w-auto flex justify-end">
                    <Link
                      href={`/torneios/${slug}/apoiar?teamId=${tt.teamId}`}
                      className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-bold text-sm hover:bg-futvar-green-light transition-colors"
                    >
                      Apoiar este time
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-lg font-bold text-white mb-4">Times confirmados</h2>
          {teamsConfirmed.length === 0 ? (
            <p className="text-futvar-light">Nenhum time confirmado ainda.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {teamsConfirmed.map((tt) => (
                <div
                  key={tt.teamId}
                  className="flex flex-col items-center gap-2 bg-futvar-dark border border-futvar-green/20 rounded-xl p-4 text-center"
                >
                  {tt.team.crestUrl && (
                    <img src={tt.team.crestUrl} alt="" className="w-12 h-12 object-contain" />
                  )}
                  <p className="font-medium text-white text-sm leading-tight">
                    {tt.team.shortName || tt.team.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {tournament.bracketStatus === 'GENERATED' && matches.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-white mb-4">Chaveamento</h2>
            <div className="space-y-6">
              {([32, 16, 8, 4, 2] as const).map((round) => {
                const roundMatches = matches.filter((m) => m.round === round);
                if (roundMatches.length === 0) return null;
                return (
                  <div key={round}>
                    <h3 className="text-sm font-medium text-futvar-light mb-2">{roundLabel[round] ?? `Rodada ${round}`}</h3>
                    <div className="space-y-2">
                      {roundMatches.map((m) => (
                        <div
                          key={m.id}
                          className="flex flex-wrap items-center gap-3 bg-futvar-dark border border-futvar-green/20 rounded-xl px-4 py-3"
                        >
                          <span className="text-futvar-light text-sm w-8">#{m.matchNumber}</span>
                          <span className="text-white text-sm flex-1 min-w-0">
                            {m.teamA?.shortName ?? m.teamA?.name ?? '—'}{' '}
                            {m.scoreA != null && m.scoreB != null ? (
                              <span className="text-futvar-green font-semibold mx-1">{m.scoreA} x {m.scoreB}</span>
                            ) : (
                              ' x '
                            )}{' '}
                            {m.teamB?.shortName ?? m.teamB?.name ?? '—'}
                          </span>
                          {m.winnerTeam && (
                            <span className="text-futvar-green text-xs font-medium">
                              Vencedor: {m.winnerTeam.shortName ?? m.winnerTeam.name}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {!isGoalMode && tournament.registrationMode === 'PAID' && (
          <p className="mt-8 text-futvar-light text-sm">
            Este torneio tem inscrição paga. Acompanhe os times confirmados acima.
          </p>
        )}
      </div>
    </div>
  );
}
