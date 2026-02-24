import Image from 'next/image';

interface TeamInfo {
  name: string;
  score?: number | null;
  crest?: string | null;
}

interface ScoreboardHeaderProps {
  teamA: TeamInfo;
  teamB: TeamInfo;
}

export function ScoreboardHeader({ teamA, teamB }: ScoreboardHeaderProps) {
  const leftScore = typeof teamA.score === 'number' ? teamA.score : 0;
  const rightScore = typeof teamB.score === 'number' ? teamB.score : 0;

  return (
    <div className="mx-auto inline-flex items-center gap-6 rounded-full border border-emerald-300/25 bg-gradient-to-r from-emerald-900/70 via-emerald-800/70 to-emerald-900/70 px-6 py-3 shadow-[0_0_30px_rgba(16,185,129,0.35)] backdrop-blur-sm">
      {/* Time A */}
      <div className="flex items-center gap-3 min-w-0">
        {teamA.crest ? (
          <div className="relative h-9 w-9 flex-shrink-0 rounded-full bg-black/40 ring-2 ring-emerald-400/60 overflow-hidden">
            <Image
              src={teamA.crest}
              alt={teamA.name}
              fill
              sizes="40px"
              className="object-contain"
            />
          </div>
        ) : (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-900/70 text-xs font-bold text-emerald-300 ring-2 ring-emerald-400/50">
            {teamA.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
            Time A
          </span>
          <span className="max-w-[140px] truncate text-sm font-semibold text-white">
            {teamA.name}
          </span>
        </div>
      </div>

      {/* Placar */}
      <div className="flex items-center gap-4 rounded-full bg-black/30 px-4 py-1 shadow-inner shadow-black/40">
        <span className="min-w-[26px] text-center text-xl font-extrabold text-white">
          {leftScore}
        </span>
        <span className="text-sm font-semibold text-emerald-300/80">x</span>
        <span className="min-w-[26px] text-center text-xl font-extrabold text-white">
          {rightScore}
        </span>
      </div>

      {/* Time B */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col text-right">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200/80">
            Time B
          </span>
          <span className="max-w-[140px] truncate text-sm font-semibold text-white">
            {teamB.name}
          </span>
        </div>
        {teamB.crest ? (
          <div className="relative h-9 w-9 flex-shrink-0 rounded-full bg-black/40 ring-2 ring-emerald-400/60 overflow-hidden">
            <Image
              src={teamB.crest}
              alt={teamB.name}
              fill
              sizes="40px"
              className="object-contain"
            />
          </div>
        ) : (
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-900/70 text-xs font-bold text-emerald-300 ring-2 ring-emerald-400/50">
            {teamB.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

