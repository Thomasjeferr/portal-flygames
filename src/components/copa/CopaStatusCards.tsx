import type { CopaStatusCardsProps } from './types';

function formatDaysRemaining(endAt: Date | null): string {
  if (!endAt) return '—';
  const now = new Date();
  if (endAt <= now) return 'Encerrado';
  const diff = Math.ceil((endAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'Encerrado';
  if (diff === 1) return '1 dia';
  return `${diff} dias`;
}

export function CopaStatusCards({
  confirmedCount,
  maxTeams,
  goalEndAt,
  leaderTeam,
  isGoalMode,
}: CopaStatusCardsProps) {
  const progressPercent = maxTeams > 0 ? Math.min(100, (confirmedCount / maxTeams) * 100) : 0;
  const daysRemaining = goalEndAt ? formatDaysRemaining(goalEndAt) : '—';

  return (
    <section className="px-4 lg:px-12 -mt-6 relative z-10">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-futvar-green/20 bg-futvar-dark/90 backdrop-blur-sm p-6 shadow-card hover:shadow-card-hover transition-shadow duration-300">
            <p className="text-futvar-light text-sm font-medium mb-2">Progresso da Copa</p>
            <p className="text-2xl font-bold text-white mb-3">
              {confirmedCount} <span className="text-futvar-light font-normal">/ {maxTeams}</span>
            </p>
            <div className="h-2 bg-futvar-darker rounded-full overflow-hidden">
              <div
                className="h-full bg-futvar-green rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-futvar-green/20 bg-futvar-dark/90 backdrop-blur-sm p-6 shadow-card hover:shadow-card-hover transition-shadow duration-300">
            <p className="text-futvar-light text-sm font-medium mb-2">Prazo da meta</p>
            <p className="text-2xl font-bold text-white">
              {daysRemaining === 'Encerrado' ? (
                <span className="text-futvar-light">Encerrado</span>
              ) : daysRemaining === '—' ? (
                '—'
              ) : (
                <>Encerramento em {daysRemaining}</>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-futvar-green/20 bg-futvar-dark/90 backdrop-blur-sm p-6 shadow-card hover:shadow-card-hover transition-shadow duration-300">
            <p className="text-futvar-light text-sm font-medium mb-2">Time líder</p>
            {leaderTeam ? (
              <>
                <p className="text-lg font-bold text-white truncate" title={leaderTeam.name}>
                  {leaderTeam.name}
                </p>
                <p className="text-futvar-green font-semibold text-sm mt-1">{leaderTeam.supporters} apoiadores</p>
              </>
            ) : (
              <p className="text-futvar-light">Nenhum ainda</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
