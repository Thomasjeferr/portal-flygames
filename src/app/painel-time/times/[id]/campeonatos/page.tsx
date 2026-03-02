'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

type TournamentItem = {
  id: string;
  name: string;
  slug: string;
  season: string | null;
  region: string | null;
  maxTeams: number;
  registrationMode: string;
  registrationFeeAmount: number | null;
  goalRequiredSupporters: number | null;
  goalPricePerSupporter: number | null;
  premiacaoTipo: string | null;
  premioPrimeiro: number | null;
  premioSegundo: number | null;
  premioTerceiro: number | null;
  premioQuarto: number | null;
  trofeuCampeao: boolean;
  trofeuVice: boolean;
  trofeuTerceiro: boolean;
  trofeuQuarto: boolean;
  trofeuArtilheiro: boolean;
  craqueDaCopa: boolean;
  regulamentoUrl: string | null;
  regulamentoTexto: string | null;
  enrolled: boolean;
  enrollment: { teamStatus: string; paymentStatus: string | null } | null;
  canEnroll: boolean;
  spotsLeft: number;
};

function formatPremio(v: number | null): string {
  if (v == null) return '';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);
}

const MEDAL_CONFIG = [
  { key: 'premioPrimeiro' as const, label: 'Ouro', sublabel: '1º', bg: 'from-amber-400 via-yellow-500 to-amber-600', border: 'border-amber-400/50' },
  { key: 'premioSegundo' as const, label: 'Prata', sublabel: '2º', bg: 'from-slate-300 via-slate-400 to-slate-500', border: 'border-slate-400/50' },
  { key: 'premioTerceiro' as const, label: 'Bronze', sublabel: '3º', bg: 'from-amber-600 via-amber-700 to-amber-800', border: 'border-amber-700/50' },
  { key: 'premioQuarto' as const, label: '4º Lugar', sublabel: '4º', bg: 'from-rose-700 via-rose-800 to-rose-900', border: 'border-rose-600/50' },
];

function TournamentCard({
  t,
  teamApproved,
  participatingId,
  onParticipar,
  onVerRegras,
  hasRegulamento,
}: {
  t: TournamentItem;
  teamApproved: boolean;
  participatingId: string | null;
  onParticipar: (tournament: TournamentItem) => void;
  onVerRegras: (tournament: TournamentItem) => void;
  hasRegulamento: (tournament: TournamentItem) => boolean;
}) {
  const filled = t.maxTeams - t.spotsLeft;
  const progressPercent = t.maxTeams > 0 ? (filled / t.maxTeams) * 100 : 0;
  const trofeus = [
    t.trofeuCampeao && 'Campeão',
    t.trofeuVice && 'Vice-campeão',
    t.trofeuTerceiro && '3º lugar',
    t.trofeuQuarto && '4º lugar',
    t.trofeuArtilheiro && 'Artilheiro',
    t.craqueDaCopa && 'Craque da Copa',
  ].filter(Boolean) as string[];

  const premios = MEDAL_CONFIG.map((m) => ({
    ...m,
    value: t[m.key],
  })).filter((p) => p.value != null) as (typeof MEDAL_CONFIG[0] & { value: number })[];

  return (
    <div className="relative rounded-2xl border border-white/10 bg-futvar-dark/95 overflow-hidden">
      {/* Fundo sutil: linhas/brilho */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-futvar-green/10 rounded-full blur-2xl" />
      </div>

      <div className="relative p-6 sm:p-8">
        {/* Vagas + barra de progresso com efeito de brilho */}
        <div className="mb-6">
          <p className="text-white text-sm font-medium mb-2">
            Vagas {filled}/{t.maxTeams} preenchidas
          </p>
          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-futvar-green to-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.5)]"
              style={{ width: `${Math.max(2, progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Título do campeonato + tagline */}
        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white uppercase tracking-tight mb-2">
          {t.name}
        </h3>
        <p className="text-futvar-light font-semibold text-base mb-6">
          Garanta sua vaga na Copa
        </p>

        {/* Badge INSCRIÇÕES ABERTAS (quando pode inscrever) */}
        {t.canEnroll && teamApproved && !t.enrolled && (
          <div className="inline-flex items-center px-4 py-2 rounded-lg bg-pink-500/20 border border-pink-400/50 text-pink-200 font-bold text-sm uppercase tracking-wide shadow-[0_0_20px_rgba(236,72,153,0.3)] mb-6">
            Inscrições abertas
          </div>
        )}

        {/* Medalhas de prêmio em dinheiro */}
        {(premios.length > 0 || trofeus.length > 0) && (
          <div className="flex flex-col lg:flex-row gap-6 mb-6">
            {premios.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {premios.map((p) => (
                  <div
                    key={p.key}
                    className={`flex flex-col items-center rounded-xl border-2 ${p.border} bg-futvar-darker/80 px-4 py-3 min-w-[100px]`}
                  >
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${p.bg} flex items-center justify-center text-white font-black text-sm mb-1`}>
                      {p.sublabel}
                    </div>
                    <span className="text-futvar-light text-xs font-medium">{p.label}</span>
                    <span className="text-white font-bold text-sm">{formatPremio(p.value)}</span>
                  </div>
                ))}
              </div>
            )}
            {trofeus.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {trofeus.map((nome) => (
                  <span key={nome} className="flex items-center gap-2 text-white text-sm">
                    <span className="text-futvar-gold" aria-hidden>🏆</span>
                    {nome}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {t.enrolled ? (
            <span className="inline-flex items-center px-5 py-3 rounded-xl bg-futvar-green/20 text-futvar-green font-semibold">
              {t.enrollment?.paymentStatus === 'paid' || t.enrollment?.teamStatus === 'CONFIRMED'
                ? '✓ Inscrito'
                : t.enrollment?.teamStatus === 'IN_GOAL'
                  ? 'Na meta'
                  : 'Aguardando pagamento'}
            </span>
          ) : t.canEnroll && teamApproved ? (
            <button
              type="button"
              onClick={() => onParticipar(t)}
              disabled={participatingId === t.id}
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-futvar-green text-futvar-darker font-bold text-base uppercase tracking-wide hover:bg-futvar-green-light disabled:opacity-50 shadow-[0_0_24px_rgba(34,197,94,0.4)] transition-all duration-200"
            >
              {participatingId === t.id ? 'Inscrevendo...' : 'Participar agora'}
            </button>
          ) : !teamApproved ? (
            <span className="text-futvar-light text-sm">Time não aprovado</span>
          ) : (
            <span className="text-futvar-light text-sm">Vagas esgotadas</span>
          )}
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/torneios/${t.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20"
            >
              Ver página do campeonato
            </Link>
            {hasRegulamento(t) && (
              <button
                type="button"
                onClick={() => onVerRegras(t)}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20"
              >
                Ver regras
              </button>
            )}
          </div>
        </div>

        {t.registrationMode === 'PAID' && t.registrationFeeAmount != null && t.registrationFeeAmount > 0 && (
          <p className="text-futvar-light text-xs mt-3">
            Inscrição: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.registrationFeeAmount)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function CampeonatosPage() {
  const params = useParams();
  const teamId = params.id as string;
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [teamApproved, setTeamApproved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [participatingId, setParticipatingId] = useState<string | null>(null);
  const [participarConfirm, setParticiparConfirm] = useState<{
    tournamentId: string;
    tournamentName: string;
  } | null>(null);
  const [aceiteRegulamento, setAceiteRegulamento] = useState(false);
  const [regulamentoModal, setRegulamentoModal] = useState<{
    title: string;
    url: string | null;
    texto: string | null;
  } | null>(null);

  useEffect(() => {
    if (!teamId) return;
    fetch(`/api/team-portal/teams/${teamId}/tournaments`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setTournaments(data.tournaments ?? []);
          setTeamApproved(data.teamApproved !== false);
        }
      })
      .catch(() => setError('Erro ao carregar campeonatos'))
      .finally(() => setLoading(false));
  }, [teamId]);

  const handleParticipar = async (tournamentId: string) => {
    setParticipatingId(tournamentId);
    setError('');
    try {
      const res = await fetch(
        `/api/team-portal/teams/${teamId}/tournaments/${tournamentId}/participar`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao inscrever');
        return;
      }
      if (data.needsPayment) {
        window.location.href = `/painel-time/times/${teamId}/campeonatos/pagar?tournamentId=${tournamentId}`;
        return;
      }
      setTournaments((prev) =>
        prev.map((t) =>
          t.id === tournamentId
            ? {
                ...t,
                enrolled: true,
                canEnroll: false,
                enrollment: {
                  teamStatus: data.tournamentTeam?.teamStatus ?? 'CONFIRMED',
                  paymentStatus: data.tournamentTeam?.paymentStatus ?? null,
                },
              }
            : t
        )
      );
    } catch {
      setError('Erro de conexão');
    } finally {
      setParticipatingId(null);
    }
  };

  const openParticiparModal = (t: TournamentItem) => {
    setParticiparConfirm({ tournamentId: t.id, tournamentName: t.name });
    setAceiteRegulamento(false);
  };

  const confirmParticipar = () => {
    if (!participarConfirm || !aceiteRegulamento) return;
    const { tournamentId } = participarConfirm;
    setParticiparConfirm(null);
    setAceiteRegulamento(false);
    handleParticipar(tournamentId);
  };

  const openRegulamento = (t: TournamentItem) => {
    if (t.regulamentoUrl) {
      window.open(t.regulamentoUrl, '_blank');
    } else if (t.regulamentoTexto) {
      setRegulamentoModal({
        title: t.name,
        url: null,
        texto: t.regulamentoTexto,
      });
    }
  };

  const hasRegulamento = (t: TournamentItem) =>
    !!(t.regulamentoUrl?.trim() || t.regulamentoTexto?.trim());

  if (loading) {
    return (
      <div className="text-futvar-light">
        Carregando campeonatos...
      </div>
    );
  }

  return (
    <div className="relative">
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Campeonatos</h2>
      <p className="text-futvar-light text-sm mb-8">
        Veja os campeonatos abertos e inscreva seu time.
      </p>

      {!teamApproved && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
          Apenas times aprovados podem se inscrever. Conclua o cadastro e aguarde a aprovação.
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {tournaments.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-futvar-dark p-12 text-center">
          <p className="text-futvar-light text-lg">Nenhum campeonato publicado no momento.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {tournaments.map((t) => (
            <TournamentCard
              key={t.id}
              t={t}
              teamApproved={teamApproved}
              participatingId={participatingId}
              onParticipar={openParticiparModal}
              onVerRegras={openRegulamento}
              hasRegulamento={hasRegulamento}
            />
          ))}
        </div>
      )}

      {participarConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => {
            setParticiparConfirm(null);
            setAceiteRegulamento(false);
          }}
        >
          <div
            className="bg-futvar-dark border border-white/20 rounded-xl max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">Confirmar inscrição</h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-futvar-light text-sm">
                Antes de inscrever seu time no campeonato <strong className="text-white">{participarConfirm.tournamentName}</strong>, confirme que você leu e aceita o regulamento.
              </p>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={aceiteRegulamento}
                  onChange={(e) => setAceiteRegulamento(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-white/30 bg-white/10 text-futvar-green focus:ring-futvar-green"
                />
                <span className="text-futvar-light text-sm group-hover:text-white">
                  Li e aceito o regulamento do campeonato.
                </span>
              </label>
            </div>
            <div className="p-5 border-t border-white/10 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setParticiparConfirm(null);
                  setAceiteRegulamento(false);
                }}
                className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmParticipar}
                disabled={!aceiteRegulamento}
                className="px-5 py-2 rounded-lg bg-futvar-green text-futvar-darker font-bold text-sm uppercase tracking-wide hover:bg-futvar-green-light disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar e inscrever
              </button>
            </div>
          </div>
        </div>
      )}

      {regulamentoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setRegulamentoModal(null)}
        >
          <div
            className="bg-futvar-dark border border-white/20 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h3 className="text-white font-semibold">{regulamentoModal.title} – Regulamento</h3>
              <button
                type="button"
                onClick={() => setRegulamentoModal(null)}
                className="text-futvar-light hover:text-white"
              >
                Fechar
              </button>
            </div>
            <div className="p-4 overflow-y-auto text-futvar-light text-sm whitespace-pre-wrap">
              {regulamentoModal.texto}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
