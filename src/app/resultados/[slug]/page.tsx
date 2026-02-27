import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ResultadoDetalhePage({ params }: Props) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) {
    return (
      <div className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6 min-h-screen bg-futvar-darker flex items-center justify-center">
        <div className="max-w-xl mx-auto text-center">
          <Link href="/resultados" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex gap-2 mb-8">
            ← Voltar aos resultados
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ver placar e súmula deste jogo
          </h1>
          <p className="text-futvar-light text-lg mb-2">
            <strong className="text-white">Cadastre-se grátis</strong> e veja todos os detalhes: placar, estatísticas e súmula oficial.
          </p>
          <p className="text-futvar-light text-sm mb-8">
            É rápido e sem custo. Depois você pode assinar para assistir aos vídeos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/cadastro?redirect=${encodeURIComponent(`/resultados/${slug}`)}`}
              className="px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors"
            >
              Criar conta grátis
            </Link>
            <Link
              href={`/entrar?redirect=${encodeURIComponent(`/resultados/${slug}`)}`}
              className="px-6 py-3 rounded-lg border-2 border-futvar-green/60 text-futvar-green font-bold hover:bg-futvar-green/10 transition-colors"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const game = await prisma.game.findUnique({
    where: { slug },
    include: {
      homeTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
      awayTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
      sumulaApprovals: { select: { status: true } },
      playerMatchStats: {
        include: { teamMember: { select: { id: true, name: true, number: true } } },
      },
    },
  });

  if (!game || game.sumulaPublishedAt == null) notFound();
  const bothApproved = game.sumulaApprovals.length === 2 && game.sumulaApprovals.every((a) => a.status === 'APROVADA');
  if (!bothApproved) notFound();

  const homeStats = game.playerMatchStats
    .filter((s) => s.teamId === game.homeTeamId)
    .map((s) => ({
      name: s.teamMember.name,
      number: s.teamMember.number,
      goals: s.goals,
      assists: s.assists,
      yellowCard: s.yellowCard,
      redCard: s.redCard,
      highlight: s.highlight,
    }));
  const awayStats = game.playerMatchStats
    .filter((s) => s.teamId === game.awayTeamId)
    .map((s) => ({
      name: s.teamMember.name,
      number: s.teamMember.number,
      goals: s.goals,
      assists: s.assists,
      yellowCard: s.yellowCard,
      redCard: s.redCard,
      highlight: s.highlight,
    }));

  const gameDateStr = new Date(game.gameDate).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const hasScore = game.homeScore != null && game.awayScore != null;

  return (
    <div className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-4xl mx-auto">
        <Link href="/resultados" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex gap-2 mb-6">
          ← Voltar aos resultados
        </Link>

        <div className="rounded-xl border border-white/10 bg-futvar-dark overflow-hidden">
          <div className="p-5 space-y-4">
            <h1 className="text-xl font-bold text-white">{game.title}</h1>
            <p className="text-futvar-light text-sm">{gameDateStr}</p>
            <p className="text-futvar-light">{game.championship}</p>

            <div className="flex flex-wrap items-center justify-center gap-4 py-4">
              <div className="flex flex-col items-center gap-2">
                {game.homeTeam?.crestUrl ? (
                  <img src={game.homeTeam.crestUrl} alt="" className="h-16 w-16 rounded object-contain border border-white/20" />
                ) : (
                  <span className="w-16 h-16 rounded bg-white/10 flex items-center justify-center text-futvar-light text-sm">
                    {game.homeTeam?.shortName?.slice(0, 2) ?? '—'}
                  </span>
                )}
                <span className="text-white font-medium text-center">{game.homeTeam?.name ?? 'Mandante'}</span>
              </div>
              {hasScore && (
                <span className="text-2xl font-bold text-futvar-green px-2">
                  {game.homeScore} x {game.awayScore}
                </span>
              )}
              {!hasScore && <span className="text-futvar-light text-lg">x</span>}
              <div className="flex flex-col items-center gap-2">
                {game.awayTeam?.crestUrl ? (
                  <img src={game.awayTeam.crestUrl} alt="" className="h-16 w-16 rounded object-contain border border-white/20" />
                ) : (
                  <span className="w-16 h-16 rounded bg-white/10 flex items-center justify-center text-futvar-light text-sm">
                    {game.awayTeam?.shortName?.slice(0, 2) ?? '—'}
                  </span>
                )}
                <span className="text-white font-medium text-center">{game.awayTeam?.name ?? 'Visitante'}</span>
              </div>
            </div>

            {game.venue && (
              <div>
                <p className="text-futvar-light text-xs uppercase tracking-wider mb-1">Local</p>
                <p className="text-white">{game.venue}</p>
              </div>
            )}
            {game.referee && (
              <div>
                <p className="text-futvar-light text-xs uppercase tracking-wider mb-1">Árbitro</p>
                <p className="text-white">{game.referee}</p>
              </div>
            )}

            {(homeStats.length > 0 || awayStats.length > 0) && (
              <>
                <h3 className="text-white font-semibold pt-4 border-t border-white/10">Estatísticas da partida</h3>
                {homeStats.length > 0 && (
                  <div>
                    <p className="text-futvar-light text-xs uppercase mb-2">{game.homeTeam?.shortName ?? game.homeTeam?.name ?? 'Mandante'}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-futvar-light border-b border-white/10">
                            <th className="py-1 pr-2">Jogador</th>
                            <th className="py-1 w-10 text-center">G</th>
                            <th className="py-1 w-10 text-center">A</th>
                            <th className="py-1 w-10 text-center">Amarelo</th>
                            <th className="py-1 w-10 text-center">Vermelho</th>
                            <th className="py-1 w-12 text-center">Destaque</th>
                          </tr>
                        </thead>
                        <tbody>
                          {homeStats.map((s, i) => (
                            <tr key={i} className="border-b border-white/5">
                              <td className="py-1 pr-2 text-white">{s.number != null ? `${s.number} · ` : ''}{s.name}</td>
                              <td className="text-center">{s.goals}</td>
                              <td className="text-center">{s.assists}</td>
                              <td className="text-center">{s.yellowCard ? '✓' : '—'}</td>
                              <td className="text-center">{s.redCard ? '✓' : '—'}</td>
                              <td className="text-center">{s.highlight ? '★' : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {awayStats.length > 0 && (
                  <div>
                    <p className="text-futvar-light text-xs uppercase mb-2 mt-4">{game.awayTeam?.shortName ?? game.awayTeam?.name ?? 'Visitante'}</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-futvar-light border-b border-white/10">
                            <th className="py-1 pr-2">Jogador</th>
                            <th className="py-1 w-10 text-center">G</th>
                            <th className="py-1 w-10 text-center">A</th>
                            <th className="py-1 w-10 text-center">Amarelo</th>
                            <th className="py-1 w-10 text-center">Vermelho</th>
                            <th className="py-1 w-12 text-center">Destaque</th>
                          </tr>
                        </thead>
                        <tbody>
                          {awayStats.map((s, i) => (
                            <tr key={i} className="border-b border-white/5">
                              <td className="py-1 pr-2 text-white">{s.number != null ? `${s.number} · ` : ''}{s.name}</td>
                              <td className="text-center">{s.goals}</td>
                              <td className="text-center">{s.assists}</td>
                              <td className="text-center">{s.yellowCard ? '✓' : '—'}</td>
                              <td className="text-center">{s.redCard ? '✓' : '—'}</td>
                              <td className="text-center">{s.highlight ? '★' : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
