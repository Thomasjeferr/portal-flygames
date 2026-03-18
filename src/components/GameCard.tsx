import Link from 'next/link';
import Image from 'next/image';

type TeamInfo = { id: string; name: string; shortName: string | null; crestUrl: string | null };

interface GameCardProps {
  slug: string;
  title: string;
  championship: string;
  thumbnailUrl: string | null;
  gameDate: string;
  featured?: boolean;
  /** Se definido, usa este href em vez de /jogo/[slug] (ex: pre-estreia) */
  href?: string;
  /** Texto do badge (padrao: ASSISTIR) */
  badgeText?: string;
  /** Se false, não exibe badge "ASSISTIR" nem botão de play (card só publicação) */
  showAssistir?: boolean;
  /** Quando true, esconde play/ASSISTIR e mostra apenas um badge alternativo (ex: "Promover time") */
  locked?: boolean;
  /** Texto do badge quando o card está "travado" (sem acesso), ex: "Promover time" */
  lockedBadgeText?: string;
  /** Quando definido, exibe faixa verde no topo da thumbnail (ex: "Patrocínio OK") */
  sponsorOkLabel?: string;
  /** Subtítulo exibido abaixo do championship quando sponsorOkLabel está definido */
  sponsorOkSubtitle?: string;
  /** Times do jogo: quando presentes, exibe logos e nomes lado a lado no card */
  homeTeam?: TeamInfo | null;
  awayTeam?: TeamInfo | null;
  /** Card de pré-estreia clubes: visual diferenciado (borda/faixa) */
  preEstreiaClubes?: boolean;
}

function TeamCrest({ team, size = 14, compact }: { team: TeamInfo; size?: number; compact?: boolean }) {
  const initial = (team.shortName || team.name).slice(0, 2).toUpperCase();
  const px = size * 4;
  const displayName = compact && team.shortName ? team.shortName : team.name;
  return (
    <div className="flex flex-col items-center gap-1 sm:gap-2 min-w-0 flex-1">
      {team.crestUrl ? (
        <div
          className="relative flex-shrink-0 rounded-lg sm:rounded-xl overflow-hidden border border-futvar-green/25 bg-futvar-dark/80 shadow-md ring-1 ring-white/5"
          style={{ width: px, height: px }}
        >
          <Image
            src={team.crestUrl.startsWith('http') ? team.crestUrl : team.crestUrl}
            alt={team.name}
            fill
            className="object-contain p-0.5"
            sizes="56px"
          />
        </div>
      ) : (
        <div
          className="rounded-lg sm:rounded-xl border border-futvar-green/30 bg-futvar-gray flex items-center justify-center text-futvar-light text-xs sm:text-sm font-bold"
          style={{ width: px, height: px }}
        >
          {initial}
        </div>
      )}
      <span
        className="text-[10px] sm:text-xs text-white font-medium text-center w-full block line-clamp-2 leading-tight"
        title={team.name}
      >
        {displayName}
      </span>
    </div>
  );
}

export function GameCard({
  slug,
  title,
  championship,
  thumbnailUrl,
  gameDate,
  featured,
  href,
  badgeText = 'ASSISTIR',
  showAssistir = true,
  homeTeam,
  awayTeam,
  locked = false,
  lockedBadgeText,
  sponsorOkLabel,
  sponsorOkSubtitle,
  preEstreiaClubes = false,
}: GameCardProps) {
  const linkHref = href ?? `/jogo/${slug}`;
  const date = new Date(gameDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
  const showTeams = homeTeam && awayTeam;
  const showWatchUi = showAssistir && !locked;
  const crestSize = preEstreiaClubes ? 12 : 14;

  return (
    <Link
      href={linkHref}
      className={`block game-card rounded-xl overflow-hidden bg-futvar-darker border group transition-colors duration-300 ${
        preEstreiaClubes
          ? 'border-futvar-gold/50 hover:border-futvar-gold'
          : 'border-futvar-green/20 hover:border-futvar-green/40'
      }`}
    >
      <div className="relative aspect-video bg-futvar-gray overflow-hidden">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl.startsWith('http') ? thumbnailUrl : thumbnailUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-futvar-field/20 to-futvar-dark">
            <span className="text-6xl opacity-60">⚽</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-futvar-darker/90 via-transparent to-transparent" />
        {preEstreiaClubes && !sponsorOkLabel && (
          <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-futvar-gold/90 text-futvar-darker text-[9px] sm:text-[10px] font-bold rounded tracking-wide leading-tight">
            PRÉ-ESTREIA CLUBES
          </span>
        )}
        {featured && (
          <span className="absolute top-3 left-3 px-3 py-1 bg-futvar-gold text-futvar-darker text-xs font-bold rounded-full shadow-lg">
            DESTAQUE
          </span>
        )}
        {sponsorOkLabel && (
          <span className="absolute top-1.5 left-1.5 right-1.5 sm:top-2 sm:left-2 sm:right-2 text-center px-1.5 py-1 sm:px-2 sm:py-1.5 rounded bg-futvar-green/90 text-futvar-darker text-[9px] sm:text-[10px] font-bold tracking-wide">
            {sponsorOkLabel}
          </span>
        )}
        {showWatchUi && !(preEstreiaClubes && !sponsorOkLabel) && (
          <span className="absolute top-1.5 right-1.5 sm:top-3 sm:right-3 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-futvar-green/90 text-white text-[9px] sm:text-xs font-semibold rounded whitespace-nowrap">
            {badgeText}
          </span>
        )}
        {showWatchUi && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
            <span className="w-16 h-16 rounded-full bg-futvar-green flex items-center justify-center text-white text-2xl pl-1 shadow-xl shadow-futvar-green/40 animate-pulse">
              ▶
            </span>
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4">
        {(showWatchUi || (locked && lockedBadgeText)) && (
          <div className="mb-1.5 sm:mb-2 flex justify-center">
            <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border border-futvar-green/40 text-[10px] sm:text-xs font-semibold text-futvar-green bg-futvar-green/5 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
              {locked && lockedBadgeText ? lockedBadgeText : badgeText}
            </span>
          </div>
        )}
        {showTeams ? (
          <div className="flex items-center justify-between gap-1 sm:gap-2 mb-1.5 sm:mb-2">
            <TeamCrest team={homeTeam} size={crestSize} compact={preEstreiaClubes} />
            <span className="text-futvar-light text-xs sm:text-sm font-semibold flex-shrink-0">x</span>
            <TeamCrest team={awayTeam} size={crestSize} compact={preEstreiaClubes} />
          </div>
        ) : (
          <h3 className="font-bold text-white line-clamp-2 text-sm sm:text-base leading-tight">{title}</h3>
        )}
        <p className="text-xs sm:text-sm text-futvar-green font-medium mt-0.5 sm:mt-1 truncate">{championship}</p>
        {sponsorOkSubtitle && (
          <p className="text-[10px] sm:text-xs text-futvar-green/90 mt-0.5 sm:mt-1 font-medium line-clamp-2 sm:line-clamp-none">
            {sponsorOkSubtitle}
          </p>
        )}
        <p className="text-[10px] sm:text-xs text-futvar-light mt-0.5 sm:mt-1">{date}</p>
      </div>
    </Link>
  );
}
