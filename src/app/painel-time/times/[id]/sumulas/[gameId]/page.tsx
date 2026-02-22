'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

type StatRow = {
  teamMemberId: string;
  name: string;
  number: number | null;
  position: string | null;
  goals: number;
  assists: number;
  fouls: number;
  yellowCard: boolean;
  redCard: boolean;
  highlight: boolean;
};

type Game = {
  id: string;
  title: string;
  championship: string;
  gameDate: string;
  description: string | null;
  thumbnailUrl: string | null;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  referee: string | null;
  sumulaPublishedAt: string | null;
  homeTeam: { id: string; name: string; shortName: string | null; crestUrl: string | null } | null;
  awayTeam: { id: string; name: string; shortName: string | null; crestUrl: string | null } | null;
  homeStats: StatRow[];
  awayStats: StatRow[];
  myApprovalStatus: string | null;
  myRejectionReason: string | null;
  otherTeamRejectionReason: string | null;
  bothApproved: boolean;
};

export default function SumulaDetailPage() {
  const params = useParams();
  const teamId = params.id as string;
  const gameId = params.gameId as string;
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const load = () => {
    fetch(`/api/team-portal/teams/${teamId}/games/${gameId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setGame(data);
      })
      .catch(() => setError('Erro ao carregar súmula'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
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

  const handleApprove = async () => {
    setActionLoading('approve');
    try {
      const res = await fetch(`/api/team-portal/teams/${teamId}/games/${gameId}/approve`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) load();
      else setError(data.error || 'Erro ao aprovar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async () => {
    const reason = rejectReason.trim();
    if (!reason) {
      setError('Informe o motivo da rejeição');
      return;
    }
    setActionLoading('reject');
    setError('');
    try {
      const res = await fetch(`/api/team-portal/teams/${teamId}/games/${gameId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowRejectModal(false);
        setRejectReason('');
        load();
      } else {
        setError(data.error || 'Erro ao rejeitar');
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <p className="text-futvar-light">Carregando...</p>;
  }

  if (error && !game) {
    return (
      <>
        <p className="text-red-400">{error}</p>
        <Link href={`/painel-time/times/${teamId}/sumulas`} className="text-futvar-green hover:underline mt-4 inline-block">
          ← Voltar às súmulas
        </Link>
      </>
    );
  }

  if (!game) return null;

  const hasScore = game.homeScore != null && game.awayScore != null;
  const hasVenue = game.venue != null && game.venue.trim() !== '';
  const hasReferee = game.referee != null && game.referee.trim() !== '';
  const hasDescription = game.description != null && game.description.trim() !== '';
  const canApproveOrReject = game.sumulaPublishedAt && game.myApprovalStatus !== 'APROVADA';

  return (
    <>
      <div className="mb-4">
        <Link href={`/painel-time/times/${teamId}/sumulas`} className="text-futvar-light hover:text-white text-sm">
          ← Voltar às súmulas
        </Link>
      </div>

      <div className="rounded-xl border border-white/10 bg-futvar-dark overflow-hidden">
        <div className="p-5 space-y-4">
          <h2 className="text-xl font-bold text-white">{game.title}</h2>
          <p className="text-futvar-light text-sm">{formatDate(game.gameDate)}</p>
          <p className="text-futvar-light">{game.championship}</p>

          {game.bothApproved && (
            <div className="rounded-lg bg-green-900/30 border border-green-500/40 px-3 py-2 text-green-300 text-sm font-medium">
              Súmula oficial (ambos os times aprovaram)
            </div>
          )}

          {game.otherTeamRejectionReason && (
            <div className="rounded-lg border border-amber-500/50 bg-amber-900/20 p-3">
              <p className="text-amber-200 text-sm font-medium">O outro time rejeitou a súmula:</p>
              <p className="text-futvar-light text-sm mt-1">{game.otherTeamRejectionReason}</p>
            </div>
          )}

          {game.myApprovalStatus === 'REJEITADA' && game.myRejectionReason && (
            <div className="rounded-lg border border-red-500/50 bg-red-900/20 p-3">
              <p className="text-red-300 text-sm font-medium">Sua rejeição (motivo informado):</p>
              <p className="text-futvar-light text-sm mt-1">{game.myRejectionReason}</p>
            </div>
          )}

          {/* Times e placar */}
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

          {canApproveOrReject && (
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading !== null}
                className="px-4 py-2 rounded-lg bg-green-700 text-white font-medium hover:bg-green-600 disabled:opacity-50"
              >
                {actionLoading === 'approve' ? 'Aprovando...' : 'Aprovar súmula'}
              </button>
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading !== null}
                className="px-4 py-2 rounded-lg bg-red-900/60 text-red-200 font-medium hover:bg-red-900/80 disabled:opacity-50"
              >
                Rejeitar
              </button>
            </div>
          )}

          {game.myApprovalStatus === 'APROVADA' && (
            <p className="text-green-400 text-sm">Você aprovou esta súmula.</p>
          )}

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

          {/* Stats - só exibir como "oficial" quando bothApproved, senão ainda mostramos os dados atuais */}
          {(game.homeStats.length > 0 || game.awayStats.length > 0) && (
            <>
              <h3 className="text-white font-semibold pt-4 border-t border-white/10">Estatísticas da partida</h3>
              {game.homeStats.length > 0 && (
                <div>
                  <p className="text-futvar-light text-xs uppercase mb-2">{game.homeTeam?.shortName ?? game.homeTeam?.name ?? 'Mandante'}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-futvar-light border-b border-white/10">
                          <th className="py-1 pr-2">Jogador</th>
                          <th className="py-1 w-10 text-center">G</th>
                          <th className="py-1 w-10 text-center">A</th>
                          <th className="py-1 w-10 text-center" title="Cartão amarelo">Amarelo</th>
                          <th className="py-1 w-10 text-center" title="Cartão vermelho">Vermelho</th>
                          <th className="py-1 w-12 text-center">Destaque</th>
                        </tr>
                      </thead>
                      <tbody>
                        {game.homeStats.map((s) => (
                          <tr key={s.teamMemberId} className="border-b border-white/5">
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
              {game.awayStats.length > 0 && (
                <div>
                  <p className="text-futvar-light text-xs uppercase mb-2 mt-4">{game.awayTeam?.shortName ?? game.awayTeam?.name ?? 'Visitante'}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-futvar-light border-b border-white/10">
                          <th className="py-1 pr-2">Jogador</th>
                          <th className="py-1 w-10 text-center">G</th>
                          <th className="py-1 w-10 text-center">A</th>
                          <th className="py-1 w-10 text-center" title="Cartão amarelo">Amarelo</th>
                          <th className="py-1 w-10 text-center" title="Cartão vermelho">Vermelho</th>
                          <th className="py-1 w-12 text-center">Destaque</th>
                        </tr>
                      </thead>
                      <tbody>
                        {game.awayStats.map((s) => (
                          <tr key={s.teamMemberId} className="border-b border-white/5">
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

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !actionLoading && setShowRejectModal(false)}>
          <div className="rounded-xl bg-futvar-dark border border-white/20 p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-2">Rejeitar súmula</h3>
            <p className="text-futvar-light text-sm mb-4">O motivo será visível ao organizador e ao outro time.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Informe o motivo da rejeição (obrigatório)"
              rows={3}
              className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder:text-futvar-light text-sm resize-none"
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading !== null}
                className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={actionLoading !== null || !rejectReason.trim()}
                className="px-4 py-2 rounded-lg bg-red-700 text-white font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {actionLoading === 'reject' ? 'Enviando...' : 'Rejeitar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
