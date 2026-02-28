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

function PremiacaoResumo({ t }: { t: TournamentItem }) {
  const hasMoney =
    t.premioPrimeiro != null ||
    t.premioSegundo != null ||
    t.premioTerceiro != null ||
    t.premioQuarto != null;
  const trofeus = [
    t.trofeuCampeao && 'Campeão',
    t.trofeuVice && 'Vice',
    t.trofeuTerceiro && '3º',
    t.trofeuQuarto && '4º',
    t.trofeuArtilheiro && 'Artilheiro',
    t.craqueDaCopa && 'Craque da Copa',
  ].filter(Boolean) as string[];
  if (!hasMoney && trofeus.length === 0) return null;
  return (
    <div className="text-sm text-futvar-light mt-2 space-y-1">
      {t.premiacaoTipo && <p>{t.premiacaoTipo}</p>}
      {hasMoney && (
        <p>
          {t.premioPrimeiro != null && `1º ${formatPremio(t.premioPrimeiro)}`}
          {t.premioSegundo != null && ` · 2º ${formatPremio(t.premioSegundo)}`}
          {t.premioTerceiro != null && ` · 3º ${formatPremio(t.premioTerceiro)}`}
          {t.premioQuarto != null && ` · 4º ${formatPremio(t.premioQuarto)}`}
        </p>
      )}
      {trofeus.length > 0 && <p>Trofeus: {trofeus.join(', ')}</p>}
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
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">Campeonatos</h2>
      <p className="text-futvar-light text-sm mb-6">
        Veja os campeonatos abertos e inscreva seu time. Prêmios e regulamento em cada card.
      </p>

      {!teamApproved && (
        <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
          Apenas times aprovados podem se inscrever em campeonatos. Conclua o cadastro e aguarde a aprovação.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {tournaments.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-futvar-dark p-8 text-center">
          <p className="text-futvar-light">Nenhum campeonato publicado no momento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border border-white/10 bg-futvar-dark p-4 sm:p-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-white font-semibold">{t.name}</h3>
                  <p className="text-futvar-light text-sm mt-1">
                    {t.season && `Temporada ${t.season}`}
                    {t.region && ` · ${t.region}`}
                    {' · '}
                    {t.maxTeams} times
                    {t.spotsLeft >= 0 && ` · ${t.spotsLeft} vagas`}
                  </p>
                  <PremiacaoResumo t={t} />
                </div>
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
                      onClick={() => openRegulamento(t)}
                      className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium hover:bg-white/20"
                    >
                      Ver regras
                    </button>
                  )}
                  {t.enrolled ? (
                    <span className="inline-flex items-center px-4 py-2 rounded-lg bg-futvar-green/20 text-futvar-green text-sm">
                      {t.enrollment?.paymentStatus === 'paid' || t.enrollment?.teamStatus === 'CONFIRMED'
                        ? 'Inscrito'
                        : t.enrollment?.teamStatus === 'IN_GOAL'
                          ? 'Na meta'
                          : 'Aguardando pagamento'}
                    </span>
                  ) : t.canEnroll && teamApproved ? (
                    <button
                      type="button"
                      onClick={() => handleParticipar(t.id)}
                      disabled={participatingId === t.id}
                      className="px-4 py-2 rounded-lg bg-futvar-green text-futvar-darker text-sm font-semibold hover:bg-futvar-green-light disabled:opacity-50"
                    >
                      {participatingId === t.id ? 'Inscrendo...' : 'Participar'}
                    </button>
                  ) : !teamApproved ? (
                    <span className="text-futvar-light text-sm">Time não aprovado</span>
                  ) : (
                    <span className="text-futvar-light text-sm">Vagas esgotadas</span>
                  )}
                </div>
              </div>
              {t.registrationMode === 'PAID' && t.registrationFeeAmount != null && t.registrationFeeAmount > 0 && (
                <p className="text-futvar-light text-xs mt-2">
                  Inscrição:{' '}
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    t.registrationFeeAmount
                  )}
                </p>
              )}
            </div>
          ))}
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
