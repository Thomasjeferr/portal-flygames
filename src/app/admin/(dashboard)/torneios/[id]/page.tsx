'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Team {
  id: string;
  name: string;
  slug: string;
  crestUrl: string | null;
}

interface TournamentTeam {
  id: string;
  tournamentId: string;
  teamId: string;
  registrationType: string;
  teamStatus: string;
  paymentStatus: string | null;
  paymentGateway: string | null;
  goalStatus: string | null;
  goalCurrentSupporters: number;
  team: Team;
}

interface Tournament {
  id: string;
  name: string;
  slug: string;
  maxTeams: number;
  registrationMode: string;
  bracketStatus?: string;
  _count?: { teams: number };
}

interface TournamentMatch {
  id: string;
  round: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  penaltiesA: number | null;
  penaltiesB: number | null;
  status: string;
  winnerTeamId: string | null;
  teamA?: Team | null;
  teamB?: Team | null;
  winnerTeam?: { id: string; name: string; shortName: string | null } | null;
}

function MatchResultForm({
  match,
  onSave,
  saving,
}: {
  match: TournamentMatch;
  onSave: (matchId: string, scoreA: number, scoreB: number, penaltiesA: number | null, penaltiesB: number | null) => void;
  saving: boolean;
}) {
  const [scoreA, setScoreA] = useState(String(match.scoreA ?? 0));
  const [scoreB, setScoreB] = useState(String(match.scoreB ?? 0));
  const [penA, setPenA] = useState(match.penaltiesA != null ? String(match.penaltiesA) : '');
  const [penB, setPenB] = useState(match.penaltiesB != null ? String(match.penaltiesB) : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sa = scoreA === '' ? 0 : parseInt(scoreA, 10);
    const sb = scoreB === '' ? 0 : parseInt(scoreB, 10);
    if (Number.isNaN(sa) || Number.isNaN(sb) || sa < 0 || sb < 0) return;
    const pa = penA === '' ? null : parseInt(penA, 10);
    const pb = penB === '' ? null : parseInt(penB, 10);
    if (pa !== null && (Number.isNaN(pa) || pa < 0)) return;
    if (pb !== null && (Number.isNaN(pb) || pb < 0)) return;
    onSave(match.id, sa, sb, pa, pb);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
      <input
        type="number"
        min={0}
        value={scoreA}
        onChange={(e) => setScoreA(e.target.value)}
        className="w-12 px-1 py-0.5 rounded bg-netflix-gray border border-white/20 text-white text-sm text-center"
      />
      <span className="text-netflix-light text-sm">x</span>
      <input
        type="number"
        min={0}
        value={scoreB}
        onChange={(e) => setScoreB(e.target.value)}
        className="w-12 px-1 py-0.5 rounded bg-netflix-gray border border-white/20 text-white text-sm text-center"
      />
      <span className="text-netflix-light text-xs">Pên.</span>
      <input
        type="number"
        min={0}
        placeholder="A"
        value={penA}
        onChange={(e) => setPenA(e.target.value)}
        className="w-10 px-1 py-0.5 rounded bg-netflix-gray border border-white/20 text-white text-xs text-center"
      />
      <input
        type="number"
        min={0}
        placeholder="B"
        value={penB}
        onChange={(e) => setPenB(e.target.value)}
        className="w-10 px-1 py-0.5 rounded bg-netflix-gray border border-white/20 text-white text-xs text-center"
      />
      <button
        type="submit"
        disabled={saving}
        className="px-2 py-1 rounded bg-green-900/50 text-green-300 text-xs font-medium hover:bg-green-900 disabled:opacity-50"
      >
        {saving ? '...' : 'Salvar'}
      </button>
    </form>
  );
}

export default function TournamentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<TournamentTeam[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [registrationType, setRegistrationType] = useState<'FREE' | 'PAID' | 'GOAL'>('FREE');
  const [error, setError] = useState('');
  const [payModal, setPayModal] = useState<TournamentTeam | null>(null);
  const [payMethod, setPayMethod] = useState<'pix' | 'card' | null>(null);
  const [pixData, setPixData] = useState<{
    qrCode: string;
    qrCodeImage?: string;
    tournamentTeamId: string;
    amountCents: number;
    expiresAt?: string;
  } | null>(null);
  const [payLoading, setPayLoading] = useState(false);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [generatingBracket, setGeneratingBracket] = useState(false);
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);

  const handleSaveMatchResult = async (matchId: string, scoreA: number, scoreB: number, penaltiesA: number | null, penaltiesB: number | null) => {
    setSavingMatchId(matchId);
    setError('');
    try {
      const res = await fetch(`/api/admin/tournaments/${id}/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoreA, scoreB, penaltiesA, penaltiesB }),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchMatches();
      } else {
        setError(data.error || 'Erro ao salvar resultado');
      }
    } finally {
      setSavingMatchId(null);
    }
  };

  const fetchTournament = async () => {
    const res = await fetch(`/api/admin/tournaments/${id}`);
    if (res.ok) {
      const data = await res.json();
      setTournament(data);
    }
  };

  const fetchTeams = async () => {
    const res = await fetch(`/api/admin/tournaments/${id}/teams`);
    if (res.ok) {
      const data = await res.json();
      setTeams(data.teams ?? []);
    }
  };

  const fetchMatches = async () => {
    const res = await fetch(`/api/admin/tournaments/${id}/matches`);
    if (res.ok) {
      const data = await res.json();
      setMatches(data.matches ?? []);
    }
  };

  const fetchAllTeams = async () => {
    const res = await fetch('/api/admin/teams?limit=500');
    if (res.ok) {
      const data = await res.json();
      setAllTeams(data.teams ?? []);
    }
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      await Promise.all([fetchTournament(), fetchTeams(), fetchAllTeams()]);
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    if (tournament?.bracketStatus === 'GENERATED') {
      fetchMatches();
    }
  }, [id, tournament?.bracketStatus]);

  // Poll status quando modal PIX está aberto com QR gerado
  useEffect(() => {
    if (!pixData?.tournamentTeamId || !payModal) return;
    const interval = setInterval(async () => {
      try {
        const [statusRes, syncRes] = await Promise.all([
          fetch(`/api/tournament-registration/${pixData.tournamentTeamId}/status`),
          fetch(`/api/tournament-registration/${pixData.tournamentTeamId}/sync-woovi`, { method: 'POST' }),
        ]);
        const statusData = await statusRes.json();
        if (statusData.paid) {
          await fetchTeams();
          setPayModal(null);
          setPayMethod(null);
          setPixData(null);
        }
        await syncRes.json();
      } catch (_) {}
    }, 3000);
    return () => clearInterval(interval);
  }, [pixData?.tournamentTeamId, payModal]);

  const handleApprove = async (teamId: string) => {
    setUpdating(teamId);
    setError('');
    try {
      const res = await fetch(`/api/admin/tournaments/${id}/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamStatus: 'CONFIRMED' }),
      });
      if (res.ok) await fetchTeams();
      else {
        const data = await res.json();
        setError(data.error || 'Erro ao aprovar');
      }
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = async (teamId: string) => {
    setUpdating(teamId);
    setError('');
    try {
      const res = await fetch(`/api/admin/tournaments/${id}/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamStatus: 'REJECTED' }),
      });
      if (res.ok) await fetchTeams();
      else {
        const data = await res.json();
        setError(data.error || 'Erro ao rejeitar');
      }
    } finally {
      setUpdating(null);
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    setAdding(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/tournaments/${id}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: selectedTeamId, registrationType }),
      });
      if (res.ok) {
        await fetchTeams();
        setSelectedTeamId('');
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao inscrever');
      }
    } finally {
      setAdding(false);
    }
  };

  const openPayModal = (tt: TournamentTeam) => {
    setPayModal(tt);
    setPayMethod(null);
    setPixData(null);
    setError('');
  };

  const handlePayWithCard = () => {
    if (!payModal) return;
    window.location.href = `/admin/torneios/${id}/pagar-inscricao?teamId=${payModal.teamId}`;
  };

  const handlePayWithPix = async () => {
    if (!payModal || !tournament) return;
    setPayLoading(true);
    setError('');
    try {
      const res = await fetch('/api/tournament-registration/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: tournament.id,
          teamId: payModal.teamId,
          method: 'pix',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao gerar PIX');
        return;
      }
      if (data.qrCode && data.tournamentTeamId) {
        setPixData({
          qrCode: data.qrCode,
          qrCodeImage: data.qrCodeImage,
          tournamentTeamId: data.tournamentTeamId,
          amountCents: data.amountCents ?? 0,
          expiresAt: data.expiresAt,
        });
        setPayMethod('pix');
      } else {
        setError('Resposta inválida do servidor');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setPayLoading(false);
    }
  };

  const handleGenerateBracket = async () => {
    setGeneratingBracket(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/tournaments/${id}/generate-bracket`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        await fetchTournament();
        await fetchMatches();
      } else {
        setError(data.error || 'Erro ao gerar chave');
      }
    } finally {
      setGeneratingBracket(false);
    }
  };

  const confirmedCount = teams.filter((t) => t.teamStatus === 'CONFIRMED').length;
  const canGenerateBracket = tournament?.bracketStatus === 'NONE' && confirmedCount >= (tournament?.maxTeams ?? 0);
  const roundLabel: Record<number, string> = {
    32: '1ª fase (32)',
    16: 'Oitavas',
    8: 'Quartas',
    4: 'Semifinal',
    2: 'Final',
  };
  const statusLabel: Record<string, string> = {
    APPLIED: 'Pendente',
    IN_GOAL: 'Em meta',
    CONFIRMED: 'Confirmado',
    REJECTED: 'Rejeitado',
    ELIMINATED: 'Eliminado',
  };
  const inscribedIds = new Set(teams.map((t) => t.teamId));
  const availableTeams = allTeams.filter((t) => !inscribedIds.has(t.id));

  if (loading || !tournament) return <p className="text-netflix-light">Carregando...</p>;

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <Link href="/admin/torneios" className="text-netflix-light hover:text-white text-sm">Voltar</Link>
          <h1 className="text-2xl font-bold text-white mt-2">{tournament.name}</h1>
          <p className="text-netflix-light text-sm">{teams.length} / {tournament.maxTeams} times</p>
        </div>
        <div className="flex items-center gap-2">
          {canGenerateBracket && (
            <button
              type="button"
              onClick={handleGenerateBracket}
              disabled={generatingBracket}
              className="px-4 py-2 rounded bg-green-900/50 text-green-300 font-semibold hover:bg-green-900 disabled:opacity-50"
            >
              {generatingBracket ? 'Gerando...' : 'Gerar chave'}
            </button>
          )}
          <Link href={`/admin/torneios/${id}/editar`} className="px-4 py-2 rounded bg-netflix-gray text-white font-semibold hover:bg-white/20">
            Editar torneio
          </Link>
        </div>
      </div>

      {error && <p className="text-netflix-red text-sm bg-red-500/10 rounded px-3 py-2 mb-4">{error}</p>}

      <div className="bg-netflix-dark border border-white/10 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Inscrever time</h2>
        <form onSubmit={handleAddTeam} className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-netflix-light mb-2">Time</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            >
              <option value="">Selecione...</option>
              {availableTeams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-netflix-light mb-2">Tipo</label>
            <select
              value={registrationType}
              onChange={(e) => setRegistrationType(e.target.value as 'FREE' | 'PAID' | 'GOAL')}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            >
              <option value="FREE">Grátis</option>
              <option value="PAID">Pago</option>
              <option value="GOAL">Meta</option>
            </select>
          </div>
          <button type="submit" disabled={adding || !selectedTeamId} className="px-4 py-3 rounded bg-netflix-red text-white font-semibold disabled:opacity-50">
            {adding ? 'Inserindo...' : 'Inscrever'}
          </button>
        </form>
      </div>

      <h2 className="text-lg font-semibold text-white mb-4">Times inscritos</h2>
      {teams.length === 0 ? (
        <p className="text-netflix-light">Nenhum time inscrito ainda.</p>
      ) : (
        <div className="space-y-3">
          {teams.map((tt) => (
            <div
              key={tt.teamId}
              className="flex flex-wrap items-center gap-4 bg-netflix-dark border border-white/10 rounded-lg p-4"
            >
              {tt.team.crestUrl && (
                <img src={tt.team.crestUrl} alt="" className="w-10 h-10 object-contain" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{tt.team.name}</p>
                <p className="text-sm text-netflix-light">
                  {tt.registrationType} • {statusLabel[tt.teamStatus] ?? tt.teamStatus}
                  {tournament.registrationMode === 'PAID' && tt.paymentStatus && ` • Pagamento: ${tt.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}`}
                  {tournament.registrationMode === 'GOAL' && tt.goalStatus && ` • ${tt.goalStatus}`}
                  {tournament.registrationMode === 'GOAL' && ` • ${tt.goalCurrentSupporters} apoiadores`}
                </p>
              </div>
              {(tt.teamStatus === 'APPLIED' || tt.teamStatus === 'IN_GOAL') && (
                <div className="flex items-center gap-2">
                  {tournament.registrationMode === 'PAID' && tt.paymentStatus !== 'paid' && (
                    <button
                      type="button"
                      onClick={() => openPayModal(tt)}
                      className="px-3 py-1.5 rounded bg-amber-900/50 text-amber-300 text-sm hover:bg-amber-900"
                    >
                      Pagar inscrição
                    </button>
                  )}
                  {tournament.registrationMode === 'GOAL' && (tt.teamStatus === 'IN_GOAL' || tt.teamStatus === 'APPLIED') && tt.registrationType === 'GOAL' && (
                    <Link
                      href={`/admin/torneios/${id}/apoiar-time?teamId=${tt.teamId}`}
                      className="px-3 py-1.5 rounded bg-sky-900/50 text-sky-300 text-sm hover:bg-sky-900"
                    >
                      Apoiar time
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => handleApprove(tt.teamId)}
                    disabled={updating === tt.teamId}
                    className="px-3 py-1.5 rounded bg-green-900/50 text-green-300 text-sm hover:bg-green-900 disabled:opacity-50"
                  >
                    {updating === tt.teamId ? '...' : 'Aprovar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(tt.teamId)}
                    disabled={updating === tt.teamId}
                    className="px-3 py-1.5 rounded bg-red-900/50 text-red-300 text-sm hover:bg-red-900 disabled:opacity-50"
                  >
                    {updating === tt.teamId ? '...' : 'Rejeitar'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tournament.bracketStatus === 'GENERATED' && matches.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Chaveamento</h2>
          <div className="space-y-6">
            {([32, 16, 8, 4, 2] as const).map((round) => {
              const roundMatches = matches.filter((m) => m.round === round);
              if (roundMatches.length === 0) return null;
              return (
                <div key={round}>
                  <h3 className="text-sm font-medium text-netflix-light mb-2">{roundLabel[round] ?? `Rodada ${round}`}</h3>
                  <div className="space-y-2">
                    {roundMatches.map((m) => (
                      <div
                        key={m.id}
                        className="flex flex-wrap items-center gap-3 bg-netflix-dark border border-white/10 rounded-lg px-4 py-2"
                      >
                        <span className="text-netflix-light text-sm w-8">#{m.matchNumber}</span>
                        <span className="text-white text-sm flex-1 min-w-0">
                          {m.teamA?.shortName ?? m.teamA?.name ?? '—'}{' '}
                          {m.status === 'FINISHED' && m.scoreA != null && m.scoreB != null ? (
                            <>
                              {m.scoreA} x {m.scoreB}
                              {(m.penaltiesA != null && m.penaltiesB != null) && (
                                <span className="text-netflix-light ml-1">(pên. {m.penaltiesA} x {m.penaltiesB})</span>
                              )}
                            </>
                          ) : (
                            'x'
                          )}{' '}
                          {m.teamB?.shortName ?? m.teamB?.name ?? '—'}
                        </span>
                        {m.winnerTeam && (
                          <span className="text-green-400 text-xs">Vencedor: {m.winnerTeam.shortName ?? m.winnerTeam.name}</span>
                        )}
                        {m.status !== 'FINISHED' && (m.teamAId || m.teamBId) && (
                          <MatchResultForm
                            match={m}
                            onSave={handleSaveMatchResult}
                            saving={savingMatchId === m.id}
                          />
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

      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-netflix-dark border border-white/20 rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-2">Pagar inscrição — {payModal.team.name}</h3>
            {!payMethod ? (
              <>
                <p className="text-netflix-light text-sm mb-4">Escolha a forma de pagamento (pagamento único).</p>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handlePayWithPix}
                    disabled={payLoading}
                    className="px-4 py-3 rounded bg-green-900/50 text-green-300 font-medium hover:bg-green-900 disabled:opacity-50"
                  >
                    {payLoading ? 'Gerando PIX...' : 'Pagar com PIX'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePayWithCard}
                    className="px-4 py-3 rounded bg-netflix-red text-white font-medium hover:bg-red-600"
                  >
                    Pagar com cartão
                  </button>
                </div>
              </>
            ) : payMethod === 'pix' && pixData ? (
              <>
                <p className="text-netflix-light text-sm mb-3">Escaneie o QR Code ou copie o código PIX.</p>
                <p className="text-white font-medium mb-2">R$ {((pixData.amountCents ?? 0) / 100).toFixed(2).replace('.', ',')}</p>
                {pixData.qrCodeImage ? (
                  <img src={pixData.qrCodeImage} alt="QR Code PIX" className="w-48 h-48 mx-auto mb-3 bg-white rounded" />
                ) : (
                  <div className="w-48 h-48 mx-auto mb-3 bg-white rounded flex items-center justify-center text-black text-xs p-2 break-all text-center">
                    {pixData.qrCode}
                  </div>
                )}
                <p className="text-netflix-light text-sm mb-4">Aguardando confirmação do pagamento...</p>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => { setPayModal(null); setPayMethod(null); setPixData(null); }}
              className="mt-4 w-full py-2 rounded bg-white/10 text-netflix-light hover:text-white text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
