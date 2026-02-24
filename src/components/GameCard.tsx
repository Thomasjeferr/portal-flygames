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
}

function TeamCrest({ team, size = 10 }: { team: TeamInfo; size?: number }) {
  const name = team.shortName || team.name;
  return (
    <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
      {team.crestUrl ? (
        <div className="relative flex-shrink-0" style={{ width: size * 4, height: size * 4 }}>
          <Image
            src={team.crestUrl.startsWith('http') ? team.crestUrl : team.crestUrl}
            alt={name}
            fill
            className="object-contain"
            sizes="40px"
          />
        </div>
      ) : (
        <div className="rounded-full bg-futvar-gray border border-futvar-green/30 flex items-center justify-center text-futvar-light text-xs font-bold" style={{ width: size * 4, height: size * 4 }}>
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span className="text-xs text-white font-medium truncate w-full text-center" title={team.name}>{name}</span>
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
}: GameCardProps) {
  const linkHref = href ?? `/jogo/${slug}`;
  const date = new Date(gameDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const showTeams = homeTeam && awayTeam;
  const showWatchUi = showAssistir && !locked;

  return (
    <Link
      href={linkHref}
      className="block game-card rounded-xl overflow-hidden bg-futvar-darker border border-futvar-green/20 group hover:border-futvar-green/40 transition-colors duration-300"
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
        {featured && (
          <span className="absolute top-3 left-3 px-3 py-1 bg-futvar-gold text-futvar-darker text-xs font-bold rounded-full shadow-lg">
            DESTAQUE
          </span>
        )}
        {sponsorOkLabel && (
          <span className="absolute top-2 left-2 right-2 text-center px-2 py-1.5 rounded bg-futvar-green/90 text-futvar-darker text-[10px] font-bold tracking-wide">
            {sponsorOkLabel}
          </span>
        )}
        {showWatchUi && (
          <span className="absolute top-3 right-3 px-2 py-1 bg-futvar-green/90 text-white text-xs font-semibold rounded">
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
      <div className="p-4">
        {(showWatchUi || (locked && lockedBadgeText)) && (
          <div className="mb-2 flex justify-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full border border-futvar-green/40 text-xs font-semibold text-futvar-green bg-futvar-green/5 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
              {locked && lockedBadgeText ? lockedBadgeText : badgeText}
            </span>
          </div>
        )}
        {showTeams ? (
          <div className="flex items-center justify-between gap-2 mb-2">
            <TeamCrest team={homeTeam} />
            <span className="text-futvar-light text-sm font-semibold flex-shrink-0">x</span>
            <TeamCrest team={awayTeam} />
          </div>
        ) : (
          <h3 className="font-bold text-white line-clamp-2 text-base leading-tight">{title}</h3>
        )}
        <p className="text-sm text-futvar-green font-medium mt-1 truncate">{championship}</p>
        {sponsorOkSubtitle && (
          <p className="text-xs text-futvar-green/90 mt-1 font-medium">{sponsorOkSubtitle}</p>
        )}
        <p className="text-xs text-futvar-light mt-1">{date}</p>
      </div>
    </Link>
  );
}
