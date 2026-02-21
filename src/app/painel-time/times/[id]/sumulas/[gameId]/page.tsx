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
  description: string | null;
  thumbnailUrl: string | null;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  referee: string | null;
  homeTeam: { id: string; name: string; shortName: string | null; crestUrl: string | null } | null;
  awayTeam: { id: string; name: string; shortName: string | null; crestUrl: string | null } | null;
};

export default function SumulaDetailPage() {
  const params = useParams();
  const teamId = params.id as string;
  const gameId = params.gameId as string;
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/team-portal/teams/${teamId}/games/${gameId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setGame(data);
      })
      .catch(() => setError('Erro ao carregar súmula'))
      .finally(() => setLoading(false));
  }, [teamId, gameId]);

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  }

  if (loading) {
    return <p className="text-futvar-light">Carregando...</p>;
  }

  if (error || !game) {
    return (
      <>
        <p className="text-red-400">{error || 'Súmula não encontrada.'}</p>
        <Link
          href={`/painel-time/times/${teamId}/sumulas`}
          className="text-futvar-green hover:underline mt-4 inline-block"
        >
          ← Voltar às súmulas
        </Link>
      </>
    );
  }

  const hasScore = game.homeScore != null && game.awayScore != null;
  const hasVenue = game.venue != null && game.venue.trim() !== '';
  const hasReferee = game.referee != null && game.referee.trim() !== '';
  const hasDescription = game.description != null && game.description.trim() !== '';

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/painel-time/times/${teamId}/sumulas`}
          className="text-futvar-light hover:text-white text-sm"
        >
          ← Voltar às súmulas
        </Link>
      </div>

      <div className="rounded-xl border border-white/10 bg-futvar-dark overflow-hidden">
        {game.thumbnailUrl && (
          <div className="aspect-video bg-black/40">
            <img
              src={game.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-5 space-y-4">
          <h2 className="text-xl font-bold text-white">{game.title}</h2>

          <p className="text-futvar-light text-sm">{formatDate(game.gameDate)}</p>

          <p className="text-futvar-light">{game.championship}</p>

          {/* Times e escudos */}
          <div className="flex flex-wrap items-center justify-center gap-4 py-4">
            <div className="flex flex-col items-center gap-2">
              {game.homeTeam?.crestUrl ? (
                <img
                  src={game.homeTeam.crestUrl}
                  alt=""
                  className="h-16 w-16 rounded object-contain border border-white/20"
                />
              ) : (
                <span className="w-16 h-16 rounded bg-white/10 flex items-center justify-center text-futvar-light text-sm">
                  {game.homeTeam?.shortName?.slice(0, 2) ?? '—'}
                </span>
              )}
              <span className="text-white font-medium text-center">
                {game.homeTeam?.name ?? 'Mandante'}
              </span>
            </div>
            {hasScore && (
              <span className="text-2xl font-bold text-futvar-green px-2">
                {game.homeScore} x {game.awayScore}
              </span>
            )}
            {!hasScore && <span className="text-futvar-light text-lg">x</span>}
            <div className="flex flex-col items-center gap-2">
              {game.awayTeam?.crestUrl ? (
                <img
                  src={game.awayTeam.crestUrl}
                  alt=""
                  className="h-16 w-16 rounded object-contain border border-white/20"
                />
              ) : (
                <span className="w-16 h-16 rounded bg-white/10 flex items-center justify-center text-futvar-light text-sm">
                  {game.awayTeam?.shortName?.slice(0, 2) ?? '—'}
                </span>
              )}
              <span className="text-white font-medium text-center">
                {game.awayTeam?.name ?? 'Visitante'}
              </span>
            </div>
          </div>

          {hasVenue && (
            <div>
              <p className="text-futvar-light text-xs uppercase tracking-wider mb-1">Local</p>
              <p className="text-white">{game.venue}</p>
            </div>
          )}

          {hasReferee && (
            <div>
              <p className="text-futvar-light text-xs uppercase tracking-wider mb-1">Árbitro</p>
              <p className="text-white">{game.referee}</p>
            </div>
          )}

          {hasDescription && (
            <div>
              <p className="text-futvar-light text-xs uppercase tracking-wider mb-1">Descrição</p>
              <p className="text-white text-sm whitespace-pre-wrap">{game.description}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
