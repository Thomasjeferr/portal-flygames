'use client';

import { useState, useCallback } from 'react';
import { MatchSummaryDropdown } from './MatchSummaryDropdown';

export type ResultadoGame = {
  id: string;
  title: string;
  slug: string;
  championship: string;
  gameDate: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { id: string; name: string; shortName: string | null; crestUrl: string | null } | null;
  awayTeam: { id: string; name: string; shortName: string | null; crestUrl: string | null } | null;
};

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function ChevronUp({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 15l-6-6-6 6" />
    </svg>
  );
}

export function ResultadosList({ games }: { games: ResultadoGame[] }) {
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);

  const handleCardClick = useCallback((id: string) => {
    setOpenMatchId((prev) => (prev === id ? null : id));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, id: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCardClick(id);
      }
    },
    [handleCardClick]
  );

  return (
    <div className="space-y-4">
      {games.map((g) => {
        const hasScore = g.homeScore != null && g.awayScore != null;
        const isOpen = openMatchId === g.id;

        return (
          <div key={g.id} className="rounded-xl border border-futvar-green/20 bg-futvar-dark shadow-[0_0_12px_rgba(34,197,94,0.08)] overflow-hidden">
            <button
              type="button"
              onClick={() => handleCardClick(g.id)}
              onKeyDown={(e) => handleKeyDown(e, g.id)}
              role="button"
              aria-expanded={isOpen}
              aria-controls={`sumula-${g.id}`}
              id={`card-${g.id}`}
              className="w-full text-left p-4 hover:bg-white/5 transition-colors cursor-pointer flex flex-wrap items-center gap-3"
            >
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
              <p className="text-futvar-light text-sm w-full mt-1">
                {g.championship} ·{' '}
                {new Date(g.gameDate).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              <span className="ml-auto flex items-center text-futvar-green" aria-hidden>
                {isOpen ? (
                  <ChevronUp className="shrink-0" />
                ) : (
                  <ChevronDown className="shrink-0" />
                )}
              </span>
            </button>

            <div
              id={`sumula-${g.id}`}
              role="region"
              aria-labelledby={`card-${g.id}`}
              className="border-t border-futvar-green/20 bg-[#070D18] shadow-[0_0_14px_rgba(34,197,94,0.1)] overflow-hidden transition-all duration-250 ease-out"
              style={{
                maxHeight: isOpen ? '800px' : '0',
                opacity: isOpen ? 1 : 0,
              }}
            >
              {isOpen && <MatchSummaryDropdown slug={g.slug} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
