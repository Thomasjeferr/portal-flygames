import Link from 'next/link';
import { GameCard } from '@/components/GameCard';
import { HeroBannerCarousel } from '@/components/HeroBannerCarousel';
import { SponsorsSection } from '@/components/SponsorsSection';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
  const [games, preSaleForClubs] = await Promise.all([
    getGames(),
    getPreSaleForClubs(),
  ]);
  const featured = games.filter((g) => g.featured);
  const byCategory = groupByCategory(games);

  return (
    <div className="min-h-screen">
      <HeroBannerCarousel />

      {/* Conteúdo */}
      <section id="jogos" className="py-12 lg:py-16 px-4 lg:px-12">
        <div className="max-w-[1920px] mx-auto">
          {preSaleForClubs.length > 0 && (
            <div id="pre-estreia" className="mb-14">
              <div className="flex items-center gap-3 mb-6 animate-fade-in-up opacity-0 [animation-delay:0.1s]">
                <span className="w-1 h-8 rounded-full bg-futvar-gold" />
                <h2 className="text-2xl lg:text-3xl font-bold text-white">
                  Pre-estreia
                </h2>
              </div>
              <p className="text-futvar-light mb-6 max-w-2xl">
                Dois clubes financiam previamente o jogo.
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

      <SponsorsSection />
    </div>
  );
}
