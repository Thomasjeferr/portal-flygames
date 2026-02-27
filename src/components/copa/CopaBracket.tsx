import Link from 'next/link';
import type { CopaBracketProps } from './types';

const ROUND_ORDER = [32, 16, 8, 4, 2] as const;

export function CopaBracket({ matches, roundLabel }: CopaBracketProps) {
  if (matches.length === 0) {
    return (
      <section id="chaveamento" className="px-4 lg:px-12 py-12 scroll-mt-24">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8">Chaveamento</h2>
          <div className="rounded-2xl border border-futvar-green/20 bg-futvar-dark/60 border-dashed p-12 text-center">
            <p className="text-futvar-light">
              O chaveamento será liberado quando todas as vagas forem preenchidas.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="chaveamento" className="px-4 lg:px-12 py-12 scroll-mt-24">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-2">Chaveamento</h2>
        <p className="text-futvar-light mb-8">Oitavas → Quartas → Semifinal → Final</p>

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-8 min-w-max">
            {ROUND_ORDER.map((round) => {
              const roundMatches = matches.filter((m) => m.round === round);
              if (roundMatches.length === 0) return null;

              return (
                <div key={round} className="flex flex-col gap-6 shrink-0">
                  <h3 className="text-sm font-semibold text-futvar-green sticky top-0 bg-futvar-darker/95 py-2">
                    {roundLabel[round] ?? `Rodada ${round}`}
                  </h3>
                  <div className="flex flex-col gap-4">
                    {roundMatches.map((m) => {
                      const isFinished = m.status === 'FINISHED';
                      const isLive = m.status === 'LIVE';
                      const hasPenalties = m.penaltiesA != null && m.penaltiesB != null;

                      return (
                        <div
                          key={m.id}
                          className={`rounded-xl border bg-futvar-dark p-4 min-w-[280px] transition-all duration-300 hover:shadow-card-hover ${
                            m.winnerTeam ? 'border-futvar-green/40 shadow-[0_0_20px_-5px_rgba(34,197,94,0.2)]' : 'border-futvar-green/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              {m.teamA?.crestUrl && (
                                <img src={m.teamA.crestUrl} alt="" className="w-8 h-8 object-contain shrink-0" />
                              )}
                              <span className="font-medium text-white text-sm truncate">
                                {m.teamA?.shortName ?? m.teamA?.name ?? '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {m.scoreA != null && m.scoreB != null ? (
                                <span className="font-bold text-futvar-green tabular-nums">
                                  {m.scoreA} x {m.scoreB}
                                  {hasPenalties && (
                                    <span className="text-futvar-light text-xs font-normal ml-1">(pên.)</span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-futvar-light text-sm">x</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                              <span className="font-medium text-white text-sm truncate text-right">
                                {m.teamB?.shortName ?? m.teamB?.name ?? '—'}
                              </span>
                              {m.teamB?.crestUrl && (
                                <img src={m.teamB.crestUrl} alt="" className="w-8 h-8 object-contain shrink-0" />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                            {m.scheduledAt && (
                              <span className="text-xs text-futvar-light">
                                {new Intl.DateTimeFormat('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }).format(new Date(m.scheduledAt))}
                              </span>
                            )}
                            <span className="text-xs">
                              {isLive ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold animate-pulse">
                                  AO VIVO
                                </span>
                              ) : isFinished ? (
                                <span className="text-futvar-light">Encerrado</span>
                              ) : (
                                <span className="text-futvar-light">Agendado</span>
                              )}
                            </span>
                          </div>
                          <Link
                            href={`#jogo-${m.id}`}
                            className="mt-2 block text-center text-xs text-futvar-green hover:text-futvar-green-light font-medium"
                          >
                            Ver detalhes
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
