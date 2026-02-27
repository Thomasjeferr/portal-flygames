import type { CopaConfirmedTeamsProps } from './types';

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

export function CopaConfirmedTeams({ teams }: CopaConfirmedTeamsProps) {
  return (
    <section className="px-4 lg:px-12 py-12 bg-futvar-darker/50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-8">Times confirmados</h2>

        {teams.length === 0 ? (
          <div className="rounded-2xl border border-futvar-green/20 bg-futvar-dark/60 border-dashed p-12 text-center">
            <div className="text-4xl mb-4">🏆</div>
            <p className="text-futvar-light max-w-sm mx-auto">
              Os times confirmados aparecerão aqui quando atingirem a meta.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {teams.map((tt) => (
              <div
                key={tt.teamId}
                className="rounded-2xl border border-futvar-green/30 bg-futvar-dark p-5 text-center transition-all duration-300 hover:shadow-card-hover hover:border-futvar-green/40"
              >
                {tt.team.crestUrl && (
                  <img
                    src={tt.team.crestUrl}
                    alt=""
                    className="w-16 h-16 object-contain mx-auto mb-3 rounded-xl bg-white/5"
                  />
                )}
                <p className="font-bold text-white text-sm leading-tight">
                  {tt.team.shortName || tt.team.name}
                </p>
                <span className="inline-block mt-2 text-xs font-semibold px-2 py-1 rounded-full bg-futvar-green/20 text-futvar-green">
                  Meta atingida
                </span>
                {tt.goalAchievedAt && (
                  <p className="text-xs text-futvar-light mt-2">{formatDate(tt.goalAchievedAt)}</p>
                )}
                {tt.goalCurrentSupporters > 0 && (
                  <p className="text-xs text-futvar-light mt-1">
                    {tt.goalCurrentSupporters} apoiadores
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
