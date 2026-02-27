'use client';

import { useEffect, useState, useCallback } from 'react';

export interface TeamOption {
  id: string;
  name: string;
  shortName?: string | null;
  crestUrl?: string | null;
  city?: string | null;
  state?: string | null;
}

function teamImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (typeof window !== 'undefined') return window.location.origin + (url.startsWith('/') ? url : `/${url}`);
  return url;
}

function TeamCrest({ team, className }: { team: TeamOption; className?: string }) {
  const src = teamImageUrl(team.crestUrl);
  const initials = (team.shortName || team.name).slice(0, 2).toUpperCase();
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!src && !imgFailed;

  return (
    <>
      {showImg && <img src={src!} alt="" className={className} onError={() => setImgFailed(true)} />}
      {!showImg && (
        <span
          className={`${className ?? ''} flex items-center justify-center rounded bg-white/20 text-xs font-bold text-white`}
          aria-hidden
        >
          {initials}
        </span>
      )}
    </>
  );
}

const GRID_MAX_HEIGHT = 320;

export interface TeamSelectorWithConfirmProps {
  selectedTeam: TeamOption | null;
  onSelect: (team: TeamOption | null) => void;
  /** Mensagem no modal, ex.: "Parte do valor da assinatura será repassada a ele." */
  confirmMessage?: string;
  /** Label da seção, ex.: "Time de coração (opcional)" */
  label?: string;
  /** Texto do link "Não quero escolher um time" */
  noneLabel?: string;
}

export function TeamSelectorWithConfirm({
  selectedTeam,
  onSelect,
  confirmMessage = 'Parte do valor será repassada a ele.',
  label = 'Time de coração (opcional)',
  noneLabel = 'Não quero escolher um time',
}: TeamSelectorWithConfirmProps) {
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [modalTeam, setModalTeam] = useState<TeamOption | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchTeams = useCallback(async (q: string) => {
    setLoading(true);
    const query = q ? `?search=${encodeURIComponent(q)}` : '';
    try {
      const r = await fetch(`/api/public/teams${query}`, { cache: 'no-store' });
      const data = await r.json();
      setTeams(Array.isArray(data) ? data : []);
    } catch {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams(debouncedSearch);
  }, [debouncedSearch, fetchTeams]);

  const handleCardClick = (team: TeamOption) => {
    setModalTeam(team);
  };

  const handleConfirm = () => {
    if (modalTeam) {
      onSelect(modalTeam);
      setModalTeam(null);
    }
  };

  const handleCancelModal = () => {
    setModalTeam(null);
  };

  const handleClearSelection = () => {
    onSelect(null);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-futvar-light mb-2">{label}</label>
      <p className="text-futvar-light text-sm mb-3">Escolha seu time. {confirmMessage}</p>

      {selectedTeam ? (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-futvar-green/10 border border-futvar-green/30 mb-3">
          <span className="h-14 w-14 rounded-xl bg-futvar-dark flex items-center justify-center overflow-hidden shrink-0 border border-futvar-green/30">
            <TeamCrest team={selectedTeam} className="h-10 w-10 object-contain" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold">{selectedTeam.name}</p>
            {(selectedTeam.city || selectedTeam.state) && (
              <p className="text-futvar-light text-sm">{[selectedTeam.city, selectedTeam.state].filter(Boolean).join(', ')}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClearSelection}
            className="text-sm font-medium text-futvar-green hover:underline"
          >
            Trocar
          </button>
        </div>
      ) : null}

      {!selectedTeam && (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou cidade"
            className="w-full px-4 py-2.5 rounded-lg bg-futvar-dark border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-futvar-green mb-3"
            aria-label="Buscar time"
          />
          <div
            className="grid grid-cols-2 gap-3 overflow-y-auto rounded-lg border border-white/20 bg-futvar-dark/50 p-3"
            style={{ maxHeight: GRID_MAX_HEIGHT }}
          >
            {loading ? (
              <div className="col-span-2 py-8 text-center text-futvar-light text-sm">Carregando...</div>
            ) : teams.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-futvar-light text-sm">Nenhum time encontrado.</div>
            ) : (
              teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleCardClick(t)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-futvar-dark border border-white/20 hover:border-futvar-green/40 hover:bg-futvar-green/5 transition-colors text-left"
                >
                  <span className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0 border border-white/20">
                    <TeamCrest team={t} className="h-10 w-10 object-contain" />
                  </span>
                  <span className="text-white font-medium text-sm text-center line-clamp-2 w-full">{t.name}</span>
                  {(t.city || t.state) && (
                    <span className="text-futvar-light text-xs text-center">
                      {[t.city, t.state].filter(Boolean).join(', ')}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </>
      )}

      {selectedTeam && (
        <button
          type="button"
          onClick={handleClearSelection}
          className="mt-2 text-sm text-futvar-light hover:text-futvar-green"
        >
          {noneLabel}
        </button>
      )}

      {modalTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-team-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-futvar-dark border border-futvar-green/30 shadow-xl p-6">
            <h3 id="confirm-team-title" className="text-lg font-semibold text-white mb-4 text-center">
              Confirmar time do coração
            </h3>
            <div className="flex flex-col items-center mb-4">
              <span className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border-2 border-futvar-green/40 mb-3">
                <TeamCrest team={modalTeam} className="h-14 w-14 object-contain" />
              </span>
              <p className="text-white font-semibold text-center">{modalTeam.name}</p>
              {(modalTeam.city || modalTeam.state) && (
                <p className="text-futvar-light text-sm">{[modalTeam.city, modalTeam.state].filter(Boolean).join(', ')}</p>
              )}
            </div>
            <p className="text-futvar-light text-sm text-center mb-6">
              É esse seu time? {confirmMessage}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelModal}
                className="flex-1 py-2.5 rounded-lg border border-white/30 text-white font-medium hover:bg-white/10"
              >
                Não, escolher outro
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light"
              >
                Sim, é meu time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
