import Link from 'next/link';
import Image from 'next/image';

interface GameCardProps {
  slug: string;
  title: string;
  championship: string;
  thumbnailUrl: string | null;
  gameDate: string;
  featured?: boolean;
}

export function GameCard({ slug, title, championship, thumbnailUrl, gameDate, featured }: GameCardProps) {
  const date = new Date(gameDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Link href={`/jogo/${slug}`} className="block game-card rounded-xl overflow-hidden bg-futvar-darker border group">
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
        <span className="absolute top-3 right-3 px-2 py-1 bg-futvar-green/90 text-white text-xs font-semibold rounded">
          ASSISTIR
        </span>
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
          <span className="w-16 h-16 rounded-full bg-futvar-green flex items-center justify-center text-white text-2xl pl-1 shadow-xl shadow-futvar-green/40 animate-pulse">
            ▶
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-white line-clamp-2 text-base leading-tight">{title}</h3>
        <p className="text-sm text-futvar-green font-medium mt-1 truncate">{championship}</p>
        <p className="text-xs text-futvar-light mt-1">{date}</p>
      </div>
    </Link>
  );
}
