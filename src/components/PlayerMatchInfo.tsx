import Image from 'next/image';

export type TeamInfo = {
  id: string;
  name: string;
  shortName: string | null;
  crestUrl: string | null;
};

interface PlayerMatchInfoProps {
  /** Título do jogo/live (ex: "Time A x Time B") – usado quando não há times ou como fallback */
  title: string;
  /** Time mandante – quando presente, exibe escudo e nome */
  homeTeam?: TeamInfo | null;
  /** Time visitante – quando presente, exibe escudo e nome */
  awayTeam?: TeamInfo | null;
  /** Texto secundário abaixo (ex: campeonato e data, ou "Pre-estreia Clubes") */
  subtitle?: React.ReactNode;
  /** Classe extra no container */
  className?: string;
}

function TeamBlock({ team }: { team: TeamInfo }) {
  const displayName = team.shortName || team.name;
  return (
    <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
      {team.crestUrl ? (
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
          <Image
            src={team.crestUrl.startsWith('http') ? team.crestUrl : team.crestUrl}
            alt={displayName}
            fill
            className="object-contain"
            sizes="96px"
          />
        </div>
      ) : (
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-futvar-dark border border-futvar-green/30 flex items-center justify-center text-futvar-green font-bold text-sm flex-shrink-0">
          {displayName.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="text-white font-semibold text-sm sm:text-base text-center truncate w-full" title={team.name}>
        {displayName}
      </span>
    </div>
  );
}

/**
 * Bloco exibido abaixo do player: escudos e nomes dos times lado a lado, ou só o título.
 * Usado em jogo, live e pré-estreia.
 */
export function PlayerMatchInfo({ title, homeTeam, awayTeam, subtitle, className = '' }: PlayerMatchInfoProps) {
  const showTeams = homeTeam && awayTeam;

  return (
    <div className={`space-y-4 ${className}`}>
      {showTeams ? (
        <div className="flex items-center justify-center gap-4 sm:gap-8 py-2">
          <TeamBlock team={homeTeam} />
          <span className="text-futvar-light font-bold text-lg sm:text-xl flex-shrink-0">x</span>
          <TeamBlock team={awayTeam} />
        </div>
      ) : (
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white text-center md:text-left">
          {title}
        </h1>
      )}
      {subtitle && (
        <div className="flex flex-wrap gap-2 text-futvar-light text-sm justify-center md:justify-start">
          {subtitle}
        </div>
      )}
    </div>
  );
}
