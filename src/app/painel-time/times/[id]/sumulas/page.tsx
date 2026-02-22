'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type Game = {
  id: string;
  title: string;
  slug: string;
  championship: string;
  gameDate: string;
  thumbnailUrl: string | null;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  referee: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  sumulaPublishedAt: string | null;
  myApprovalStatus: string | null;
  homeTeam: { id: string; name: string; shortName: string | null; crestUrl: string | null } | null;
  awayTeam: { id: string; name: string; shortName: string | null; crestUrl: string | null } | null;
};

export default function SumulasListPage() {
  const params = useParams();
  const teamId = params.id as string;
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/team-portal/teams/${teamId}/games`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setGames(Array.isArray(data) ? data : []);
      })
      .catch(() => setError('Erro ao carregar jogos'))
      .finally(() => setLoading(false));
  }, [teamId]);

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-4">Súmulas</h2>
      <p className="text-futvar-light text-sm mb-6">
        Jogos em que seu time participou. Clique para ver a súmula (dados preenchidos pelo organizador).
      </p>

      {error && (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      )}

      {loading ? (
        <p className="text-futvar-light">Carregando...</p>
      ) : games.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-futvar-dark p-8 text-center text-futvar-light">
          Nenhum jogo cadastrado para este time ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((g) => {
            const hasScore = g.homeScore != null && g.awayScore != null;
            return (
              <Link
                key={g.id}
                href={`/painel-time/times/${teamId}/sumulas/${g.id}`}
                className="block rounded-xl border border-white/10 bg-futvar-dark p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex flex-wrap items-center gap-3">
                  {g.homeTeam?.crestUrl ? (
                    <img
                      src={g.homeTeam.crestUrl}
                      alt=""
                      className="h-10 w-10 rounded object-contain border border-white/20"
                    />
                  ) : (
                    <span className="w-10 h-10 rounded bg-white/10 flex items-center justify-center text-futvar-light text-xs">
                      {g.homeTeam?.shortName?.slice(0, 2) ?? '—'}
                    </span>
                  )}
                  <span className="text-white font-medium">
                    {g.homeTeam?.shortName ?? g.homeTeam?.name ?? 'Mandante'}
                  </span>
                  {hasScore ? (
                    <span className="text-futvar-green font-bold">
                      {g.homeScore} x {g.awayScore}
                    </span>
                  ) : (
                    <span className="text-futvar-light text-sm">x</span>
                  )}
                  <span className="text-white font-medium">
                    {g.awayTeam?.shortName ?? g.awayTeam?.name ?? 'Visitante'}
                  </span>
                  {g.awayTeam?.crestUrl ? (
                    <img
                      src={g.awayTeam.crestUrl}
                      alt=""
                      className="h-10 w-10 rounded object-contain border border-white/20"
                    />
                  ) : (
                    <span className="w-10 h-10 rounded bg-white/10 flex items-center justify-center text-futvar-light text-xs">
                      {g.awayTeam?.shortName?.slice(0, 2) ?? '—'}
                    </span>
                  )}
                </div>
                <p className="text-futvar-light text-sm mt-2">
                  {g.championship} · {formatDate(g.gameDate)}
                </p>
                {g.sumulaPublishedAt && (
                  <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${
                    g.myApprovalStatus === 'APROVADA' ? 'bg-green-900/40 text-green-300' :
                    g.myApprovalStatus === 'REJEITADA' ? 'bg-red-900/40 text-red-300' :
                    'bg-yellow-900/40 text-yellow-300'
                  }`}>
                    {g.myApprovalStatus === 'APROVADA' ? 'Aprovado' : g.myApprovalStatus === 'REJEITADA' ? 'Rejeitado' : 'Aguardando sua aprovação'}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
