import Link from 'next/link';
import Image from 'next/image';
import { GameCard } from '@/components/GameCard';
import { prisma } from '@/lib/db';
import { extractYouTubeVideoId } from '@/lib/youtube';

export const dynamic = 'force-dynamic';

type HeroConfig = {
  heroType: string;
  heroMediaUrl: string | null;
  overlayColor: string;
  overlayOpacity: number;
  videoStartSeconds: number | null;
  videoEndSeconds: number | null;
  videoLoop: boolean;
};

async function getHeroConfig(): Promise<HeroConfig> {
  try {
    const row = await prisma.heroConfig.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (!row) return { heroType: 'none', heroMediaUrl: null, overlayColor: '#000000', overlayOpacity: 0.5, videoStartSeconds: null, videoEndSeconds: null, videoLoop: true };
    return {
      heroType: row.heroType,
      heroMediaUrl: row.heroMediaUrl,
      overlayColor: row.overlayColor,
      overlayOpacity: row.overlayOpacity,
      videoStartSeconds: row.videoStartSeconds,
      videoEndSeconds: row.videoEndSeconds,
      videoLoop: row.videoLoop,
    };
  } catch {
    return { heroType: 'none', heroMediaUrl: null, overlayColor: '#000000', overlayOpacity: 0.5, videoStartSeconds: null, videoEndSeconds: null, videoLoop: true };
  }
}

type GameWithCategory = {
  id: string;
  title: string;
  slug: string;
  championship: string;
  gameDate: string;
  thumbnailUrl: string | null;
  featured: boolean;
  category: { id: string; name: string; slug: string; order: number } | null;
  /** Para pre-estreia: link para /pre-estreia/[slug] */
  href?: string;
};

async function getPreSaleForClubs() {
  try {
    return prisma.preSaleGame.findMany({
      where: { status: { in: ['PRE_SALE', 'FUNDED'] } },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, title: true, slug: true, thumbnailUrl: true, fundedClubsCount: true, createdAt: true },
    });
  } catch {
    return [];
  }
}

async function getGames(): Promise<GameWithCategory[]> {
  try {
    const [games, preSaleGames] = await Promise.all([
      prisma.game.findMany({
        orderBy: [{ order: 'asc' }, { featured: 'desc' }, { gameDate: 'desc' }],
        select: {
          id: true,
          title: true,
          slug: true,
          championship: true,
          gameDate: true,
          thumbnailUrl: true,
          featured: true,
          category: { select: { id: true, name: true, slug: true, order: true } },
        },
      }),
      prisma.preSaleGame.findMany({
        where: {
          status: 'PUBLISHED',
          videoUrl: { not: null },
        },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          slug: true,
          thumbnailUrl: true,
          featured: true,
          createdAt: true,
          normalCategories: {
            include: { category: { select: { id: true, name: true, slug: true } } },
          },
        },
      }),
    ]);

    const mappedGames = games.map((g) => ({
      ...g,
      gameDate: g.gameDate.toISOString(),
      category: g.category,
    })) as GameWithCategory[];

    const preSaleMapped = preSaleGames.map((g) => {
      const firstCat = g.normalCategories[0]?.category;
      return {
        id: g.id,
        title: g.title,
        slug: g.slug,
        championship: 'Pre-estreia Clubes',
        gameDate: g.createdAt.toISOString(),
        thumbnailUrl: g.thumbnailUrl,
        featured: g.featured,
        category: firstCat ? { ...firstCat, order: 0 } : null,
        href: `/pre-estreia/assistir/${g.slug}`,
      } as GameWithCategory;
    });

    return [...mappedGames, ...preSaleMapped];
  } catch {
    return [];
  }
}

function groupByCategory(games: GameWithCategory[]): { name: string; id: string; order: number; games: GameWithCategory[] }[] {
  const map = new Map<string, { name: string; id: string; order: number; games: GameWithCategory[] }>();
  const noCategory: GameWithCategory[] = [];
  for (const g of games) {
    if (g.category) {
      const key = g.category.id;
      if (!map.has(key)) map.set(key, { id: key, name: g.category.name, order: g.category.order, games: [] });
      map.get(key)!.games.push(g);
    } else {
      noCategory.push(g);
    }
  }
  const categories = Array.from(map.values()).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  if (noCategory.length > 0) categories.push({ id: '', name: 'Outros', order: 9999, games: noCategory });
  return categories;
}

export default async function HomePage() {
  const [games, heroConfig, preSaleForClubs] = await Promise.all([
    getGames(),
    getHeroConfig(),
    getPreSaleForClubs(),
  ]);
  const featured = games.filter((g) => g.featured);
  const byCategory = groupByCategory(games);

  const hasMedia = heroConfig.heroType !== 'none' && heroConfig.heroMediaUrl;
  const youtubeId = heroConfig.heroType === 'youtube' && heroConfig.heroMediaUrl
    ? extractYouTubeVideoId(heroConfig.heroMediaUrl)
    : null;
  const overlayStyle = {
    backgroundColor: heroConfig.overlayColor,
    opacity: heroConfig.overlayOpacity,
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section - fundo e overlay configuráveis pelo admin */}
      <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 px-4 lg:px-12 overflow-hidden min-h-[28rem]">
        {/* Fundo: padrão, imagem ou vídeo */}
        {!hasMedia && (
          <>
            <div className="absolute inset-0 bg-hero-pattern field-pattern animate-fade-in opacity-0 [animation-delay:0s]" />
            <div className="absolute inset-0 bg-grass-gradient animate-fade-in opacity-0 [animation-delay:0.05s]" />
          </>
        )}
        {hasMedia && heroConfig.heroType === 'image' && heroConfig.heroMediaUrl && (
          <div className="absolute inset-0">
            <Image
              src={heroConfig.heroMediaUrl}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          </div>
        )}
        {hasMedia && heroConfig.heroType === 'youtube' && youtubeId && (() => {
          const params = new URLSearchParams({ autoplay: '1', mute: '1', controls: '0', showinfo: '0', rel: '0', modestbranding: '1' });
          if (heroConfig.videoLoop) {
            params.set('loop', '1');
            params.set('playlist', youtubeId);
          }
          if (heroConfig.videoStartSeconds != null) params.set('start', String(heroConfig.videoStartSeconds));
          if (heroConfig.videoEndSeconds != null) params.set('end', String(heroConfig.videoEndSeconds));
          return (
          <div className="absolute inset-0 min-w-full min-h-full overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?${params.toString()}`}
              title="Vídeo de fundo"
              className="absolute left-1/2 top-1/2 min-w-[100vw] min-h-[56.25vw] w-[177.78vh] h-[100vh] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ border: 0 }}
              allow="autoplay; encrypted-media"
            />
          </div>
          );
        })()}
        {hasMedia && heroConfig.heroType === 'pandavideo' && heroConfig.heroMediaUrl && (() => {
          const base = heroConfig.heroMediaUrl;
          const pvParams = new URLSearchParams(base.includes('?') ? base.split('?')[1] || '' : '');
          if (heroConfig.videoStartSeconds != null) pvParams.set('start', String(heroConfig.videoStartSeconds));
          if (heroConfig.videoEndSeconds != null) pvParams.set('end', String(heroConfig.videoEndSeconds));
          pvParams.set('loop', heroConfig.videoLoop ? '1' : '0');
          const pvUrl = base.includes('?') ? `${base.split('?')[0]}?${pvParams.toString()}` : `${base}?${pvParams.toString()}`;
          return (
          <div className="absolute inset-0 min-w-full min-h-full overflow-hidden">
            <iframe
              src={pvUrl}
              title="Vídeo de fundo"
              className="absolute left-1/2 top-1/2 min-w-[100vw] min-h-[56.25vw] w-[177.78vh] h-[100vh] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ border: 0 }}
              allow="autoplay; encrypted-media"
            />
          </div>
          );
        })()}
        {/* Overlay para legibilidade do texto */}
        {hasMedia && (
          <div
            className="absolute inset-0"
            style={overlayStyle}
            aria-hidden
          />
        )}
        <div className="relative max-w-[1920px] mx-auto z-10">
          <div className="max-w-3xl">
            <span className="inline-block px-4 py-1.5 rounded-full bg-futvar-green/20 text-futvar-green text-sm font-semibold mb-6 border border-futvar-green/30 animate-fade-in-up opacity-0 [animation-delay:0.1s]">
              FILMAGEM COM DRONES
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 animate-fade-in-up opacity-0 [animation-delay:0.2s]">
              Futebol de várzea
              <span className="block text-futvar-green">visão aérea</span>
            </h1>
            <p className="text-lg sm:text-xl text-futvar-light mb-8 max-w-xl animate-fade-in-up opacity-0 [animation-delay:0.35s]">
              Assista às melhores partidas filmadas com drones. 
              Cada lance com a emoção de quem está em campo — do céu.
            </p>
            <div className="flex flex-wrap gap-4 animate-fade-in-up opacity-0 [animation-delay:0.5s]">
              <Link
                href="/cadastro"
                className="px-8 py-4 rounded-lg bg-futvar-green text-futvar-darker font-bold text-lg hover:bg-futvar-green-light transition-colors shadow-lg shadow-futvar-green/25"
              >
                Começar a assistir
              </Link>
              <Link
                href="/entrar"
                className="px-8 py-4 rounded-lg border-2 border-futvar-green/50 text-futvar-green font-bold text-lg hover:bg-futvar-green/10 transition-colors"
              >
                Já tenho conta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Conteúdo */}
      <section className="py-12 lg:py-16 px-4 lg:px-12">
        <div className="max-w-[1920px] mx-auto">
          {preSaleForClubs.length > 0 && (
            <div className="mb-14">
              <div className="flex items-center gap-3 mb-6 animate-fade-in-up opacity-0 [animation-delay:0.1s]">
                <span className="w-1 h-8 rounded-full bg-futvar-gold" />
                <h2 className="text-2xl lg:text-3xl font-bold text-white">
                  Pre-estreia — Apoie seu clube
                </h2>
              </div>
              <p className="text-futvar-light mb-6 max-w-2xl">
                Dois clubes financiam previamente o jogo. Escolha seu clube, faça o pagamento e aguarde a publicação.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {preSaleForClubs.map((g, i) => (
                  <div key={g.id} className="animate-scale-in opacity-0" style={{ animationDelay: `${0.15 + i * 0.05}s` }}>
                    <GameCard
                      slug={g.slug}
                      title={g.title}
                      championship={`Financiados: ${g.fundedClubsCount}/2`}
                      thumbnailUrl={g.thumbnailUrl}
                      gameDate={g.createdAt.toISOString()}
                      featured={false}
                      href={`/pre-estreia/${g.id}/checkout`}
                      badgeText="APOIAR"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {featured.length > 0 && (
            <div className="mb-14">
              <div className="flex items-center gap-3 mb-6 animate-fade-in-up opacity-0 [animation-delay:0.15s]">
                <span className="w-1 h-8 rounded-full bg-futvar-gold" />
                <h2 className="text-2xl lg:text-3xl font-bold text-white">
                  Principais jogos
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {featured.map((game, i) => (
                  <div key={game.id + game.slug} className="animate-scale-in opacity-0" style={{ animationDelay: `${0.2 + i * 0.06}s` }}>
                    <GameCard slug={game.slug} title={game.title} championship={game.championship} thumbnailUrl={game.thumbnailUrl} gameDate={game.gameDate} featured={game.featured} href={game.href} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {games.length === 0 ? (
            <div className="text-center py-24 rounded-2xl border-2 border-dashed border-futvar-green/20 bg-futvar-green/5 animate-fade-in opacity-0 [animation-delay:0.2s]">
              <div className="text-6xl mb-4">⚽</div>
              <p className="text-xl text-futvar-light font-medium">Nenhum jogo disponível no momento.</p>
              <p className="mt-2 text-futvar-light/80">Em breve teremos transmissões incríveis para você assistir.</p>
            </div>
          ) : (
            <>
              {byCategory.map((cat, catIndex) => (
                <div key={cat.id || 'outros'} className="mb-14">
                  <div
                    className="flex items-center gap-3 mb-6 animate-fade-in-up opacity-0"
                    style={{ animationDelay: `${0.15 + catIndex * 0.08}s` }}
                  >
                    <span className="w-1 h-8 rounded-full bg-futvar-green" />
                    <h2 className="text-2xl lg:text-3xl font-bold text-white">
                      {cat.name}
                    </h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                    {cat.games.map((game, i) => (
                      <div
                        key={game.id + game.slug}
                        className="animate-scale-in opacity-0"
                        style={{ animationDelay: `${0.25 + catIndex * 0.08 + i * 0.05}s` }}
                      >
                        <GameCard slug={game.slug} title={game.title} championship={game.championship} thumbnailUrl={game.thumbnailUrl} gameDate={game.gameDate} featured={game.featured} href={game.href} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4 lg:px-12 mt-8 animate-fade-in opacity-0 [animation-delay:0.4s]">
        <div className="max-w-[1920px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-2xl font-bold text-futvar-green">FLY GAMES</span>
          <p className="text-sm text-futvar-light">
            Futebol de várzea filmado com drones • Visão aérea de cada lance
          </p>
        </div>
      </footer>
    </div>
  );
}
