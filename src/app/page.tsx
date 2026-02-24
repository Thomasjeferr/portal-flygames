import Link from 'next/link';
import { GameCard } from '@/components/GameCard';
import { HeroBannerCarousel } from '@/components/HeroBannerCarousel';
import { ContinueWatchingSection } from '@/components/ContinueWatchingSection';
import { LiveNowSection } from '@/components/LiveNowSection';
import { FindGameSection } from '@/components/FindGameSection';
import { SponsorsSection } from '@/components/SponsorsSection';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

type GameWithCategory = {
  id: string;
  title: string;
  slug: string;
  championship: string;
  gameDate: string;
  createdAt: string;
  thumbnailUrl: string | null;
  featured: boolean;
  displayMode?: string;
  category: { id: string; name: string; slug: string; order: number } | null;
  homeTeam?: { id: string; name: string; shortName: string | null; crestUrl: string | null } | null;
  awayTeam?: { id: string; name: string; shortName: string | null; crestUrl: string | null } | null;
  /** Para pre-estreia: link para /pre-estreia/[slug] */
  href?: string;
};

type LiveReplayCard = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  endedAt: string;
};

type PreSaleMetaCard = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  createdAt: string;
  homeTeamName: string | null;
  awayTeamName: string | null;
  homeCurrent: number | null;
  homeTarget: number | null;
  awayCurrent: number | null;
  awayTarget: number | null;
};

async function getPreSaleForClubs() {
  try {
    const games = await prisma.preSaleGame.findMany({
      where: {
        status: { in: ['PRE_SALE', 'FUNDED'] },
        ...({ metaEnabled: false } as { metaEnabled?: boolean }),
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        thumbnailUrl: true,
        fundedClubsCount: true,
        createdAt: true,
      },
    });
    return games;
  } catch {
    return [];
  }
}

async function getPreSaleWithMeta(): Promise<PreSaleMetaCard[]> {
  try {
    const games = await prisma.preSaleGame.findMany({
      where: {
        status: { in: ['PRE_SALE', 'FUNDED'] },
        ...({ metaEnabled: true } as { metaEnabled?: boolean }),
        homeTeamId: { not: null },
        awayTeamId: { not: null },
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: 6,
    });
    const cards: PreSaleMetaCard[] = [];
    for (const g of games) {
      const homeId = g.homeTeamId!;
      const awayId = g.awayTeamId!;
      const meta = g as { metaExtraPerTeam?: number | null; metaHomeTotal?: number | null; metaAwayTotal?: number | null };
      if (!meta.metaExtraPerTeam) continue;
      const [homeCount, awayCount] = await Promise.all([
        prisma.subscription.count({
          where: { active: true, user: { favoriteTeamId: homeId } },
        }),
        prisma.subscription.count({
          where: { active: true, user: { favoriteTeamId: awayId } },
        }),
      ]);
      const [homeTeam, awayTeam] = await Promise.all([
        prisma.team.findUnique({ where: { id: homeId }, select: { name: true, shortName: true } }),
        prisma.team.findUnique({ where: { id: awayId }, select: { name: true, shortName: true } }),
      ]);
      const homeTarget = meta.metaHomeTotal ?? homeCount + meta.metaExtraPerTeam;
      const awayTarget = meta.metaAwayTotal ?? awayCount + meta.metaExtraPerTeam;
      cards.push({
        id: g.id,
        title: g.title,
        thumbnailUrl: g.thumbnailUrl,
        createdAt: g.createdAt.toISOString(),
        homeTeamName: homeTeam?.shortName || homeTeam?.name || null,
        awayTeamName: awayTeam?.shortName || awayTeam?.name || null,
        homeCurrent: homeCount,
        homeTarget,
        awayCurrent: awayCount,
        awayTarget,
      });
    }
    return cards;
  } catch {
    return [];
  }
}

async function getGames(): Promise<GameWithCategory[]> {
  try {
    const [games, preSaleGames] = await Promise.all([
      prisma.game.findMany({
        where: { displayMode: { in: ['public_no_media', 'public_with_media'] } },
        orderBy: [{ order: 'asc' }, { featured: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          slug: true,
          championship: true,
          gameDate: true,
          thumbnailUrl: true,
          featured: true,
          displayMode: true,
          createdAt: true,
          category: { select: { id: true, name: true, slug: true, order: true } },
          homeTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
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
      createdAt: g.createdAt.toISOString(),
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
        createdAt: g.createdAt.toISOString(),
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

async function getLiveReplays(): Promise<LiveReplayCard[]> {
  try {
    // Mostra lives que têm replay (com ou sem status ENDED no banco).
    const lives = await prisma.live.findMany({
      where: {
        cloudflarePlaybackId: { not: null },
      },
      orderBy: [
        { endAt: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        endAt: true,
        updatedAt: true,
      },
      take: 8,
    });

    return lives.map((l) => ({
      id: l.id,
      title: l.title,
      thumbnailUrl: l.thumbnailUrl,
      endedAt: (l.endAt ?? l.updatedAt).toISOString(),
    }));
  } catch {
    return [];
  }
}

const MAX_GAMES_PER_ROW = 10;

/**
 * Agrupa jogos (apenas os que não são pré-estreia clubes) por categoria
 * para as faixas da home. O nome da categoria vira a headline.
 * Dentro de cada categoria, o primeiro jogo é sempre o último adicionado
 * (ordenado por createdAt desc, caindo para gameDate se necessário).
 */
function groupByChampionship(
  games: GameWithCategory[],
): { championship: string; games: GameWithCategory[]; categoryId?: string }[] {
  // Ignora pré-estreias (essas já têm bloco próprio)
  const regularGames = games.filter(
    (g) => !g.href?.startsWith('/pre-estreia') && g.category
  );

  type Group = { label: string; order: number; categoryId: string; games: GameWithCategory[] };
  const map = new Map<string, Group>();

  for (const g of regularGames) {
    const cat = g.category!;
    const key = cat.id;
    if (!map.has(key)) {
      map.set(key, { label: cat.name, order: cat.order ?? 0, categoryId: key, games: [] });
    }
    map.get(key)!.games.push(g);
  }

  const rows = Array.from(map.values()).map(({ label, order, categoryId, games }) => {
    const sortedGames = [...games].sort((a, b) => {
      const aDateStr = a.createdAt || a.gameDate;
      const bDateStr = b.createdAt || b.gameDate;
      const aTime = new Date(aDateStr).getTime();
      const bTime = new Date(bDateStr).getTime();
      return bTime - aTime; // mais novo primeiro
    });
    return {
      championship: label,
      games: sortedGames,
      order,
      categoryId,
    };
  });

  // Ordena categorias pela ordem configurada e, em seguida, pelo nome
  return rows
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.championship.localeCompare(b.championship);
    })
    .map(({ championship, games, categoryId }) => ({ championship, games, categoryId }));
}

export default async function HomePage() {
  const [games, preSaleForClubs, preSaleWithMeta, liveReplays] = await Promise.all([
    getGames(),
    getPreSaleForClubs(),
    getPreSaleWithMeta(),
    getLiveReplays(),
  ]);
  const byChampionship = groupByChampionship(games);

  return (
    <div className="min-h-screen">
      <HeroBannerCarousel />
      <ContinueWatchingSection />
      <LiveNowSection />

      {/* Conteúdo */}
      <section id="jogos" className="py-12 lg:py-16 px-4 lg:px-12">
        <div className="max-w-[1920px] mx-auto">
          {preSaleWithMeta.length > 0 && (
            <div id="pre-estreias-meta" className="mb-14">
              <div className="flex items-center gap-3 mb-4 animate-fade-in-up opacity-0 [animation-delay:0.08s]">
                <span className="w-1 h-8 rounded-full bg-futvar-green" />
                <h2 className="text-2xl lg:text-3xl font-bold text-white">
                  Pré-estreias com Meta
                </h2>
              </div>
              <p className="text-futvar-light mb-6 max-w-2xl">
                Quando as torcidas batem a meta de novos <span className="font-semibold text-white">Patrocinadores Torcedores</span>, o jogo de pré-estreia libera para todo mundo.
                Ao se tornar Patrocinador Torcedor, você <span className="font-semibold text-white">investe diretamente no seu time</span>, ajuda a bater a meta deste jogo e ainda libera todo o conteúdo normal do portal na hora.
              </p>
              <div className="space-y-4">
                {preSaleWithMeta.map((g, idx) => {
                  const homePct = g.homeCurrent != null && g.homeTarget ? Math.min(100, Math.round((g.homeCurrent / g.homeTarget) * 100)) : 0;
                  const awayPct = g.awayCurrent != null && g.awayTarget ? Math.min(100, Math.round((g.awayCurrent / g.awayTarget) * 100)) : 0;
                  return (
                    <div
                      key={g.id}
                      className="bg-futvar-dark/80 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row gap-4 lg:gap-6 animate-fade-in-up opacity-0"
                      style={{ animationDelay: `${0.1 + idx * 0.04}s` }}
                    >
                      <div className="w-full lg:w-64 flex-shrink-0">
                        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center">
                          {g.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={g.thumbnailUrl} alt={g.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-futvar-light text-xs">Pré-estreia</div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col gap-3">
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold text-white">
                            {g.title}
                            {g.homeTeamName && g.awayTeamName && (
                              <span className="block text-sm text-futvar-light font-normal">
                                {g.homeTeamName} x {g.awayTeamName}
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-futvar-light mt-1">
                            Criado em {new Date(g.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="space-y-2 mt-1">
                          <div>
                            <div className="flex justify-between text-xs text-futvar-light mb-1">
                              <span>
                                Time mandante
                                {g.homeTeamName && (
                                  <> ({g.homeTeamName})</>
                                )}
                              </span>
                              {g.homeCurrent != null && g.homeTarget != null && (
                                <span>{g.homeCurrent} / {g.homeTarget}</span>
                              )}
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-2.5 rounded-full bg-futvar-green transition-all"
                                style={{ width: `${homePct}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs text-futvar-light mb-1">
                              <span>
                                Time visitante
                                {g.awayTeamName && (
                                  <> ({g.awayTeamName})</>
                                )}
                              </span>
                              {g.awayCurrent != null && g.awayTarget != null && (
                                <span>{g.awayCurrent} / {g.awayTarget}</span>
                              )}
                            </div>
                            <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-2.5 rounded-full bg-futvar-green/70 transition-all"
                                style={{ width: `${awayPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                          <p className="text-xs text-futvar-light max-w-md">
                            Ao se tornar <span className="font-semibold text-white">Patrocinador Torcedor</span>, você apoia financeiramente o seu time, participa da meta desta pré-estreia e libera todo o conteúdo normal do portal para você.
                          </p>
                          <Link
                            href="/planos"
                            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-bold text-sm hover:bg-futvar-green-light transition-colors"
                          >
                          Ser Patrocinador Torcedor
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
          {liveReplays.length > 0 && (
            <div id="ultimos-jogos" className="mb-14 scroll-mt-24">
              <div className="flex items-center gap-3 mb-6 animate-fade-in-up opacity-0 [animation-delay:0.12s]">
                <span className="w-1 h-8 rounded-full bg-red-500" />
                <h2 className="text-2xl lg:text-3xl font-bold text-white flex items-center gap-2">
                  Últimos jogos ao vivo
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 border border-red-500/40">
                    Replays
                  </span>
                </h2>
              </div>
              <p className="text-futvar-light mb-6 max-w-2xl">
                Assista às transmissões que já rolaram, disponíveis como replay para quem tem acesso.
              </p>
              <div className="overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
                <div className="flex gap-5" style={{ width: 'max-content', minWidth: '100%' }}>
                  {liveReplays.map((live, i) => (
                    <div key={live.id} className="flex-shrink-0 w-[280px] sm:w-[300px] animate-scale-in opacity-0" style={{ animationDelay: `${0.18 + i * 0.05}s` }}>
                      <GameCard
                        slug={live.id}
                        title={live.title}
                        championship="Replay de live"
                        thumbnailUrl={live.thumbnailUrl}
                        gameDate={live.endedAt}
                        featured={false}
                        href={`/live/${live.id}`}
                        badgeText="REPLAY"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {byChampionship.length > 0 && (
            <div id="jogos-por-campeonato" className="mb-14">
              <div className="space-y-10">
                {byChampionship.map((row, rowIndex) => {
                  const slice = row.games.slice(0, MAX_GAMES_PER_ROW);
                  const catalogUrl = row.categoryId
                    ? `/jogos?categoria=${encodeURIComponent(row.categoryId)}`
                    : '/jogos';
                  return (
                    <div
                      key={row.championship}
                      className="animate-fade-in-up opacity-0"
                      style={{ animationDelay: `${0.16 + rowIndex * 0.04}s` }}
                    >
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="w-1 h-8 rounded-full bg-futvar-green" />
                          <h2 className="text-2xl lg:text-3xl font-bold text-white">
                            {row.championship}
                          </h2>
                        </div>
                        <Link
                          href={catalogUrl}
                          className="text-futvar-green hover:underline text-sm font-semibold shrink-0"
                        >
                          Ver todos →
                        </Link>
                      </div>
                      <div className="overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
                        <div className="flex gap-5" style={{ width: 'max-content', minWidth: '100%' }}>
                          {slice.map((game) => (
                            <div key={game.id + game.slug} className="flex-shrink-0 w-[280px] sm:w-[300px]">
                              <GameCard slug={game.slug} title={game.title} championship={game.championship} thumbnailUrl={game.thumbnailUrl} gameDate={game.gameDate} featured={game.featured} href={game.href} homeTeam={game.homeTeam ?? undefined} awayTeam={game.awayTeam ?? undefined} showAssistir={game.displayMode === 'public_with_media'} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {games.length === 0 && preSaleForClubs.length === 0 && preSaleWithMeta.length === 0 && (
            <div className="text-center py-24 rounded-2xl border-2 border-dashed border-futvar-green/20 bg-futvar-green/5 animate-fade-in opacity-0 [animation-delay:0.2s]">
              <div className="text-6xl mb-4">⚽</div>
              <p className="text-xl text-futvar-light font-medium">Nenhum jogo disponível no momento.</p>
              <p className="mt-2 text-futvar-light/80">Em breve teremos transmissões incríveis para você assistir.</p>
            </div>
          )}
        </div>
      </section>

      <FindGameSection />
      <SponsorsSection />
    </div>
  );
}
