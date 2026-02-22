'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Game = {
  id: string;
  title: string;
  championship: string;
  gameDate: string;
  homeScore: number | null;
  awayScore: number | null;
  sumulaPublishedAt: string | null;
  homeTeam: { id: string; name: string; shortName: string | null; crestUrl: string | null } | null;
  awayTeam: { id: string; name: string; shortName: string | null; crestUrl: string | null } | null;
  sumulaApprovals: { teamId: string; status: string; rejectionReason: string | null; rejectedAt: string | null; approvedAt: string | null }[];
};

export default function AdminSumulasPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/sumulas/games')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setGames(Array.isArray(data) ? data : []);
      })
      .finally(() => setLoading(false));
  }, []);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function approvalLabel(game: Game, teamId: string | null) {
    if (!teamId) return null;
    const a = game.sumulaApprovals.find((x) => x.teamId === teamId);
    if (!a) return 'Pendente';
    if (a.status === 'APROVADA') return 'Aprovado';
    if (a.status === 'REJEITADA') return 'Rejeitado';
    return 'Pendente';
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-white mb-2">Súmula</h1>
      <p className="text-netflix-light text-sm mb-8">
        Preencha os resultados (placar e estatísticas) que lhe foram passados. Os times aprovam ou rejeitam no painel do time.
      </p>

      {loading ? (
        <p className="text-netflix-light">Carregando jogos...</p>
      ) : games.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-netflix-dark p-8 text-center text-netflix-light">
          Nenhum jogo cadastrado.
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((g) => {
            const homeStatus = approvalLabel(g, g.homeTeam?.id ?? null);
            const awayStatus = approvalLabel(g, g.awayTeam?.id ?? null);
            const hasScore = g.homeScore != null && g.awayScore != null;
            return (
              <Link
                key={g.id}
                href={`/admin/sumulas/${g.id}`}
                className="block rounded-xl border border-white/10 bg-netflix-dark p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-white font-medium">
                    {g.homeTeam?.shortName ?? g.homeTeam?.name ?? 'Mandante'}
                  </span>
                  {hasScore ? (
                    <span className="text-netflix-red font-bold">
                      {g.homeScore} x {g.awayScore}
                    </span>
                  ) : (
                    <span className="text-netflix-light text-sm">— x —</span>
                  )}
                  <span className="text-white font-medium">
                    {g.awayTeam?.shortName ?? g.awayTeam?.name ?? 'Visitante'}
                  </span>
                </div>
                <p className="text-netflix-light text-sm mt-2">
                  {g.championship} · {formatDate(g.gameDate)}
                </p>
                <div className="flex flex-wrap gap-3 mt-3 text-xs">
                  {g.sumulaPublishedAt ? (
                    <>
                      <span className="text-netflix-light">
                        Mandante: <span className={homeStatus === 'Rejeitado' ? 'text-red-400' : homeStatus === 'Aprovado' ? 'text-green-400' : 'text-yellow-400'}>{homeStatus}</span>
                      </span>
                      <span className="text-netflix-light">
                        Visitante: <span className={awayStatus === 'Rejeitado' ? 'text-red-400' : awayStatus === 'Aprovado' ? 'text-green-400' : 'text-yellow-400'}>{awayStatus}</span>
                      </span>
                    </>
                  ) : (
                    <span className="text-netflix-light">Súmula ainda não publicada</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
