import Image from 'next/image';

interface TeamInfo {
  name: string;
  score?: number | null;
  crest?: string | null;
}

interface ScoreboardHeaderProps {
  teamA: TeamInfo;
  teamB: TeamInfo;
  /** Quando true, exibe apenas "vs" no centro (ex.: página da live sem placar) */
  hideScore?: boolean;
}

export function ScoreboardHeader({ teamA, teamB, hideScore = false }: ScoreboardHeaderProps) {
  const leftScore = typeof teamA.score === 'number' ? teamA.score : 0;
  const rightScore = typeof teamB.score === 'number' ? teamB.score : 0;

  return (
    <div className="mx-auto inline-flex w-full max-w-[1100px] items-center justify-between gap-4 rounded-2xl border border-emerald-400/40 bg-[#0a1f1a] px-5 py-4 shadow-[0_0_30px_rgba(16,185,129,0.2)] sm:gap-6 sm:px-6 sm:py-4">
      {/* Time A */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {teamA.crest ? (
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-black/40 ring-2 ring-emerald-400/50">
            <Image
              src={teamA.crest}
              alt={teamA.name}
              fill
              sizes="40px"
              className="object-contain"
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-800/80 text-xs font-bold text-emerald-300 ring-2 ring-emerald-400/50">
            {teamA.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300/90 sm:text-[11px]">
            Time A
          </span>
          <span className="truncate text-sm font-semibold text-white sm:text-base">
            {teamA.name}
          </span>
        </div>
      </div>

      {/* Placar ou "vs" */}
      <div className="flex flex-shrink-0 items-center gap-3 rounded-xl bg-black/40 px-5 py-2 ring-1 ring-emerald-400/20">
        {hideScore ? (
          <span className="text-base font-semibold text-emerald-400/90">vs</span>
        ) : (
          <>
            <span className="min-w-[2rem] text-center text-2xl font-extrabold text-white sm:text-3xl">
              {leftScore}
            </span>
            <span className="text-base font-semibold text-emerald-400/90">x</span>
            <span className="min-w-[2rem] text-center text-2xl font-extrabold text-white sm:text-3xl">
              {rightScore}
            </span>
          </>
        )}
      </div>

      {/* Time B */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
        <div className="min-w-0 flex flex-col items-end">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300/90 sm:text-[11px]">
            Time B
          </span>
          <span className="truncate text-sm font-semibold text-white sm:text-base">
            {teamB.name}
          </span>
        </div>
        {teamB.crest ? (
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-black/40 ring-2 ring-emerald-400/50">
            <Image
              src={teamB.crest}
              alt={teamB.name}
              fill
              sizes="40px"
              className="object-contain"
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-800/80 text-xs font-bold text-emerald-300 ring-2 ring-emerald-400/50">
            {teamB.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

