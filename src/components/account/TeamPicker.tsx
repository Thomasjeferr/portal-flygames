'use client';

import { useEffect, useState } from 'react';

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

interface TeamPickerProps {
  selectedTeam: TeamOption | null;
  onSelect: (team: TeamOption | null) => void;
  onSave: () => void;
  saving: boolean;
  placeholder?: string;
}

export function TeamPicker({ selectedTeam, onSelect, onSave, saving, placeholder = 'Buscar time...' }: TeamPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingTeams(true);
    const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
    fetch(`/api/public/teams${q}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => setTeams(Array.isArray(data) ? data : []))
      .catch(() => setTeams([]))
      .finally(() => setLoadingTeams(false));
  }, [open, search]);

  const displayName = (t: TeamOption) => [t.name, t.city || t.state].filter(Boolean).join(' · ') || t.name;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <input
            type="text"
            value={open ? search : (selectedTeam ? displayName(selectedTeam) : '')}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 180)}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 rounded-lg bg-futvar-darker border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-futvar-green focus:border-transparent"
          />
          {open && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-60 overflow-auto rounded-lg border border-white/20 bg-futvar-dark shadow-xl">
              {loadingTeams ? (
                <div className="p-4 text-futvar-light text-sm">Carregando...</div>
              ) : teams.length === 0 ? (
                <div className="p-4 text-futvar-light text-sm">Nenhum time encontrado.</div>
              ) : (
                <ul className="py-1">
                  {teams.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onSelect(t);
                          setOpen(false);
                          setSearch('');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/10 transition-colors"
                      >
                        <span className="h-8 w-8 rounded bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          <TeamCrest team={t} className="h-6 w-6 object-contain" />
                        </span>
                        <span className="text-white font-medium truncate">{t.name}</span>
                        {(t.city || t.state) && (
                          <span className="text-futvar-light text-sm truncate">{[t.city, t.state].filter(Boolean).join(', ')}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !selectedTeam}
          className="px-4 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Salvando...' : 'Salvar time do coração'}
        </button>
      </div>
    </div>
  );
}

export function TeamDisplay({ team, onChange }: { team: TeamOption; onChange: () => void }) {
  const src = teamImageUrl(team.crestUrl);
  const initials = (team.shortName || team.name).slice(0, 2).toUpperCase();
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = src && !imgFailed;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
      <span className="h-14 w-14 rounded-xl bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
        {showImg && <img src={src!} alt="" className="h-12 w-12 object-contain" onError={() => setImgFailed(true)} />}
        {!showImg && <span className="text-lg font-bold text-white">{initials}</span>}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold truncate">{team.name}</p>
        {(team.city || team.state) && (
          <p className="text-futvar-light text-sm">{[team.city, team.state].filter(Boolean).join(', ')}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onChange}
        className="text-sm font-medium text-futvar-green hover:underline"
      >
        Trocar time
      </button>
    </div>
  );
}
