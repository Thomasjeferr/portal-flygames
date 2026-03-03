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
  isScheduled?: boolean;
  isReplay?: boolean;
  /** Quando true, ScoreboardHeader exibe apenas "vs" no centro (ex.: live sem placar) */
  hideScore?: boolean;
  description?: string | null;
  children: ReactNode;
}

export function MatchPlayerPage({
  teamA,
  teamB,
  title,
  dateLabel,
  isLive = false,
  isScheduled = false,
  isReplay = true,
  hideScore = false,
  description,
  children,
}: MatchPlayerPageProps) {
  const hasTeams = Boolean(teamA && teamB);

  return (
    <section className="relative flex flex-col items-center w-full">
      {/* Vinheta suave no topo */}
      <div className="pointer-events-none absolute -top-32 h-72 w-[900px] max-w-full rounded-full bg-[radial-gradient(circle,_rgba(34,197,94,0.35),_transparent_65%)] opacity-70 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-[1100px] flex-col items-center px-4 sm:px-6">
        {hasTeams && teamA && teamB ? (
          <div className="mb-5 w-full sm:mb-6">
            <ScoreboardHeader teamA={teamA} teamB={teamB} hideScore={hideScore} />
          </div>
        ) : (
          <h1 className="mb-4 text-center text-lg font-bold text-white sm:text-xl">{title}</h1>
        )}

        {/* Card do player / placeholder */}
        <div className="w-full">{children}</div>

        <MatchMeta title={title} dateLabel={dateLabel} isLive={isLive} isScheduled={isScheduled} isReplay={isReplay} />

        {description && (
          <p className="mt-4 max-w-3xl text-center text-sm leading-relaxed text-emerald-50/80 md:text-left">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}

