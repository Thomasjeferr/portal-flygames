import { ReactNode } from 'react';
import { ScoreboardHeader } from './ScoreboardHeader';
import { MatchMeta } from './MatchMeta';

interface TeamInfo {
  name: string;
  score?: number | null;
  crest?: string | null;
}

interface MatchPlayerPageProps {
  teamA?: TeamInfo | null;
  teamB?: TeamInfo | null;
  title: string;
  dateLabel: string;
  isLive?: boolean;
  isReplay?: boolean;
  description?: string | null;
  children: ReactNode;
}

export function MatchPlayerPage({
  teamA,
  teamB,
  title,
  dateLabel,
  isLive = false,
  isReplay = true,
  description,
  children,
}: MatchPlayerPageProps) {
  const hasTeams = Boolean(teamA && teamB);

  return (
    <section className="relative flex flex-col items-center">
      {/* Vinheta suave no topo da página */}
      <div className="pointer-events-none absolute -top-32 h-72 w-[900px] max-w-full rounded-full bg-[radial-gradient(circle,_rgba(34,197,94,0.45),_transparent_65%)] opacity-70 blur-3xl" />

      <div className="relative z-10 flex w-full flex-col items-center">
        {hasTeams && teamA && teamB ? (
          <div className="mb-5 sm:mb-6">
            <ScoreboardHeader teamA={teamA} teamB={teamB} />
          </div>
        ) : (
          <h1 className="mb-4 text-center text-lg sm:text-xl font-bold text-white">{title}</h1>
        )}

        {/* Card do player */}
        <div className="w-full">{children}</div>

        <MatchMeta title={title} dateLabel={dateLabel} isLive={isLive} isReplay={isReplay} />

        {description && (
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-emerald-50/80 text-center md:text-left">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}

