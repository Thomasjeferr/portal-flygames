import Link from 'next/link';
import type { CopaRankingLeaderboardProps } from './types';

const SUBSCRIBER_MESSAGE =
  'Você já é assinante do portal. O apoio por meta é voltado a novos torcedores. Obrigado por fazer parte da família!';

export function CopaRankingLeaderboard({
  teams,
  goalRequired,
  goalPrice,
  slug,
  isAlreadySubscriber = false,
}: CopaRankingLeaderboardProps) {
  const priceFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goalPrice);

  if (teams.length === 0) return null;

  return (
    <section id="ranking" className="px-4 lg:px-12 py-12 scroll-mt-24">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-2">Ranking de ativação</h2>
        <p className="text-futvar-light mb-4">
          Apoie com assinatura de <strong className="text-futvar-green">{priceFormatted}/mês</strong>. Ao atingir{' '}
          {goalRequired} apoiadores, o time é confirmado.
        </p>
        {isAlreadySubscriber && (
          <p className="mb-8 rounded-xl bg-futvar-green/10 border border-futvar-green/30 text-futvar-green/90 text-sm font-medium px-4 py-3">
            {SUBSCRIBER_MESSAGE}
          </p>
        )}
        {!isAlreadySubscriber && <div className="mb-8" />}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {teams.map((tt, index) => {
            const percent = goalRequired > 0 ? Math.min(100, (tt.goalCurrentSupporters / goalRequired) * 100) : 0;
            const remaining = Math.max(0, goalRequired - tt.goalCurrentSupporters);
            const topSupporters = teams[0]?.goalCurrentSupporters ?? 0;
            const isLeader = index === 0 && topSupporters > 0;
            const isAlmostThere = percent >= 80;

            return (
              <div
                key={tt.teamId}
                className={`rounded-2xl border bg-futvar-dark p-5 transition-all duration-300 hover:shadow-card-hover animate-fade-in-up ${
                  isLeader
                    ? 'border-futvar-green/40 shadow-[0_0_30px_-5px_rgba(34,197,94,0.25)]'
                    : 'border-futvar-green/20 hover:border-futvar-green/30'
                }`}
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl font-black text-futvar-light/80 tabular-nums">#{index + 1}</span>
                  {tt.team.crestUrl && (
                    <img
                      src={tt.team.crestUrl}
                      alt=""
                      className="w-14 h-14 object-contain shrink-0 rounded-lg bg-white/5"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-bold text-white truncate">{tt.team.name}</p>
                      {isLeader && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-futvar-green/20 text-futvar-green">
                          🔥 Líder
                        </span>
                      )}
                      {isAlmostThere && !isLeader && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                          🚀 Quase lá
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-futvar-green tabular-nums">
                      {tt.goalCurrentSupporters} <span className="text-futvar-light font-normal">/ {goalRequired}</span>
                    </p>
                    <p className="text-sm text-futvar-light mt-0.5">{percent.toFixed(0)}%</p>
                    <div className="h-2 bg-futvar-darker rounded-full overflow-hidden mt-3">
                      <div
                        className="h-full bg-futvar-green rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-futvar-light mt-2">
                      Faltam {remaining} apoiador{remaining !== 1 ? 'es' : ''}
                    </p>
                    {isAlreadySubscriber ? (
                      <p className="mt-4 text-center text-sm text-futvar-light/80 py-2.5">
                        Você já é assinante
                      </p>
                    ) : (
                      <Link
                        href={`/torneios/${slug}/apoiar?teamId=${tt.teamId}`}
                        className="mt-4 inline-flex items-center justify-center w-full py-2.5 rounded-xl bg-futvar-green text-futvar-darker font-bold text-sm hover:bg-futvar-green-light transition-colors duration-200"
                      >
                        Quero apoiar este time
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
