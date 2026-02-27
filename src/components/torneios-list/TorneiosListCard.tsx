import Link from 'next/link';

export type TorneioListItem = {
  id: string;
  name: string;
  slug: string;
  season: string | null;
  maxTeams: number;
  registrationMode: string;
  _count: { teams: number };
};

function statusBadge(mode: string) {
  if (mode === 'GOAL') return { label: 'Meta ativa', className: 'bg-futvar-green/20 text-futvar-green' };
  if (mode === 'PAID') return { label: 'Inscrição paga', className: 'bg-amber-500/20 text-amber-400' };
  return { label: 'Em andamento', className: 'bg-futvar-green/20 text-futvar-green' };
}

export function TorneiosListCard({ t }: { t: TorneioListItem }) {
  const progress = t.maxTeams > 0 ? Math.min(100, (t._count.teams / t.maxTeams) * 100) : 0;
  const badge = statusBadge(t.registrationMode);

  return (
    <article className="group rounded-2xl border border-futvar-green/20 bg-futvar-dark overflow-hidden transition-all duration-300 hover:border-futvar-green/40 hover:shadow-card-hover">
      <div className="h-2 bg-gradient-to-r from-futvar-green/40 to-futvar-green/10" aria-hidden />
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <h2 className="text-xl font-bold text-white leading-tight">{t.name}</h2>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        {t.season && (
          <p className="text-futvar-light text-sm mb-4">Temporada {t.season}</p>
        )}
        <p className="text-futvar-green font-bold text-lg tabular-nums mb-2">
          {t._count.teams} <span className="text-futvar-light font-normal">/ {t.maxTeams}</span> vagas
        </p>
        <div className="h-2 bg-futvar-darker rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-futvar-green rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-futvar-light text-sm mb-5">
          {t._count.teams} de {t.maxTeams} times confirmados
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/torneios/${t.slug}`}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-futvar-green text-futvar-darker font-bold text-sm hover:bg-futvar-green-light transition-colors"
          >
            Ver Campeonato
          </Link>
          {t.registrationMode === 'GOAL' && (
            <Link
              href={`/torneios/${t.slug}`}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border-2 border-futvar-green/50 text-futvar-green font-semibold text-sm hover:bg-futvar-green/10 transition-colors"
            >
              Apoiar
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
