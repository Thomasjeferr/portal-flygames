'use client';

import { useEffect, useState } from 'react';

type PlayerStat = {
  id: string;
  name: string;
  photoUrl: string | null;
  goals: number;
  assists: number;
  yellow: boolean;
  red: boolean;
};

type SumulaData = {
  id: string;
  slug: string;
  title: string;
  homeTeam: { name: string; shortName: string | null; crestUrl: string | null } | null;
  awayTeam: { name: string; shortName: string | null; crestUrl: string | null } | null;
  score: { home: number; away: number };
  competitionName: string;
  date: string;
  stats: { home: PlayerStat[]; away: PlayerStat[] };
};

function PlayerPhoto({ name, photoUrl }: { name: string; photoUrl: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const sizeClass = 'w-9 h-9 min-w-[36px] min-h-[36px]';

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${sizeClass} rounded-full object-cover border border-white/20`}
      />
    );
  }
  return (
    <span
      className={`${sizeClass} rounded-full bg-white/10 flex items-center justify-center text-futvar-light text-sm font-medium`}
      aria-hidden
    >
      {initial}
    </span>
  );
}

function StatsTable({
  teamLabel,
  stats,
}: {
  teamLabel: string;
  stats: PlayerStat[];
}) {
  if (stats.length === 0) {
    return (
      <div>
        <p className="text-futvar-light text-xs uppercase tracking-wider mb-2">{teamLabel}</p>
        <p className="text-futvar-light text-sm">Nenhum jogador na súmula.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-futvar-light text-xs uppercase tracking-wider mb-2">{teamLabel}</p>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm" role="table">
          <thead>
            <tr className="bg-futvar-green/20 text-white border-b border-futvar-green/30">
              <th scope="col" className="py-2 pl-3 pr-2 text-left font-semibold w-10">Foto</th>
              <th scope="col" className="py-2 pr-2 text-left font-semibold">Jogador</th>
              <th scope="col" className="py-2 px-2 text-center font-semibold w-10">G</th>
              <th scope="col" className="py-2 px-2 text-center font-semibold w-10">A</th>
              <th scope="col" className="py-2 px-2 text-center font-semibold w-10" title="Amarelo">🟨</th>
              <th scope="col" className="py-2 px-2 text-center font-semibold w-10" title="Vermelho">🟥</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-2 pl-3 pr-2">
                  <PlayerPhoto name={s.name} photoUrl={s.photoUrl} />
                </td>
                <td className="py-2 pr-2 text-white">{s.name}</td>
                <td className="py-2 px-2 text-center text-futvar-light">{s.goals}</td>
                <td className="py-2 px-2 text-center text-futvar-light">{s.assists}</td>
                <td className="py-2 px-2 text-center">{s.yellow ? '✓' : '—'}</td>
                <td className="py-2 px-2 text-center">{s.red ? '✓' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MatchSummaryDropdown({ slug }: { slug: string }) {
  const [data, setData] = useState<SumulaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/resultados/${encodeURIComponent(slug)}/sumula`)
      .then((res) => {
        if (!res.ok) throw new Error('Erro ao carregar');
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-futvar-light text-sm">Carregando súmula...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center">
        <p className="text-futvar-light text-sm">Sem súmula disponível para este jogo.</p>
      </div>
    );
  }

  const hasStats = data.stats.home.length > 0 || data.stats.away.length > 0;
  const homeLabel = `Mandante (${data.homeTeam?.shortName ?? data.homeTeam?.name ?? '—'})`;
  const awayLabel = `Visitante (${data.awayTeam?.shortName ?? data.awayTeam?.name ?? '—'})`;

  return (
    <div className="p-4 sm:p-5">
      <h4 className="text-futvar-light text-xs uppercase tracking-wider mb-4">
        Estatísticas / Súmula
      </h4>
      {!hasStats ? (
        <p className="text-futvar-light text-sm">Sem súmula disponível para este jogo.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StatsTable teamLabel={homeLabel} stats={data.stats.home} />
          <StatsTable teamLabel={awayLabel} stats={data.stats.away} />
        </div>
      )}
    </div>
  );
}
