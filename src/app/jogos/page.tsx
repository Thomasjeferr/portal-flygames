import Link from 'next/link';
import { GameCard } from '@/components/GameCard';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const GAMES_PER_PAGE = 24;

type SearchParams = {
  q?: string;
  time?: string;
  campeonato?: string;
  ano?: string;
  categoria?: string;
};

async function getFilterOptions() {
  const [championships, years, gamesCount] = await Promise.all([
    prisma.game.findMany({
      where: { displayMode: { in: ['public_no_media', 'public_with_media'] } },
      select: { championship: true },
      distinct: ['championship'],
      orderBy: { championship: 'asc' },
    }),
    prisma.game.findMany({
      where: { displayMode: { in: ['public_no_media', 'public_with_media'] } },
      select: { gameDate: true },
    }),
    prisma.game.count({ where: { displayMode: { in: ['public_no_media', 'public_with_media'] } } }),
  ]);
  const yearSet = new Set(years.map((g) => new Date(g.gameDate).getFullYear()));
  const yearList = Array.from(yearSet).sort((a, b) => b - a);
  return {
    championships: championships.map((c) => c.championship),
    years: yearList,
    totalGames: gamesCount,
  };
}

async function getGames(params: SearchParams) {
  const q = params.q?.trim().toLowerCase();
  const teamId = params.time?.trim() || null;
  const championship = params.campeonato?.trim() || null;
  const year = params.ano ? parseInt(params.ano, 10) : null;
  const categoryId = params.categoria?.trim() || null;

  const andConditions: object[] = [];
  if (teamId) {
    andConditions.push({ OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] });
  }
  if (championship) {
    andConditions.push({ championship });
  }
  if (categoryId) {
    andConditions.push({ categoryId });
  }
  if (year && !Number.isNaN(year)) {
    andConditions.push({
      gameDate: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    });
  }
  if (q) {
    andConditions.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { championship: { contains: q, mode: 'insensitive' as const } },
        { homeTeam: { name: { contains: q, mode: 'insensitive' as const } } },
        { homeTeam: { shortName: { contains: q, mode: 'insensitive' as const } } },
        { awayTeam: { name: { contains: q, mode: 'insensitive' as const } } },
        { awayTeam: { shortName: { contains: q, mode: 'insensitive' as const } } },
      ],
    });
  }

  const where: Parameters<typeof prisma.game.findMany>[0]['where'] = {
    displayMode: { in: ['public_no_media', 'public_with_media'] },
    ...(andConditions.length > 0 ? { AND: andConditions } : {}),
  };

  const games = await prisma.game.findMany({
    where,
    orderBy: [{ gameDate: 'desc' }, { createdAt: 'desc' }],
    take: GAMES_PER_PAGE,
    select: {
      id: true,
      title: true,
      slug: true,
      championship: true,
      gameDate: true,
      thumbnailUrl: true,
      featured: true,
      displayMode: true,
      homeTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
      awayTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
    },
  });

  return games.map((g) => ({
    ...g,
    gameDate: g.gameDate.toISOString(),
  }));
}

export default async function JogosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [games, options, teams] = await Promise.all([
    getGames(params),
    getFilterOptions(),
    prisma.team.findMany({
      where: { isActive: true, approvalStatus: 'approved' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, shortName: true },
    }),
  ]);

  const currentQ = params.q ?? '';
  const currentTeamId = params.time ?? '';
  const currentChampionship = params.campeonato ?? '';
  const currentYear = params.ano ?? '';

  return (
    <div className="pt-24 pb-16 px-4 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-[1920px] mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-futvar-green hover:underline text-sm font-semibold inline-flex gap-2">
            ← Voltar ao início
          </Link>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white mb-8">
          Catálogo de jogos
        </h1>

        <form method="get" action="/jogos" className="flex flex-col gap-4 mb-10">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              name="q"
              defaultValue={currentQ}
              placeholder="Buscar por jogo, time ou campeonato..."
              className="flex-1 px-4 py-3 rounded-lg bg-futvar-dark border border-futvar-green/20 text-white placeholder-futvar-light/60 focus:outline-none focus:ring-2 focus:ring-futvar-green"
            />
            <select
              name="time"
              defaultValue={currentTeamId}
              className="px-4 py-3 rounded-lg bg-futvar-dark border border-futvar-green/20 text-white focus:outline-none focus:ring-2 focus:ring-futvar-green min-w-[180px]"
            >
              <option value="">Todos os times</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.shortName || t.name}
                </option>
              ))}
            </select>
            <select
              name="campeonato"
              defaultValue={currentChampionship}
              className="px-4 py-3 rounded-lg bg-futvar-dark border border-futvar-green/20 text-white focus:outline-none focus:ring-2 focus:ring-futvar-green min-w-[180px]"
            >
              <option value="">Todos os campeonatos</option>
              {options.championships.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              name="ano"
              defaultValue={currentYear}
              className="px-4 py-3 rounded-lg bg-futvar-dark border border-futvar-green/20 text-white focus:outline-none focus:ring-2 focus:ring-futvar-green min-w-[120px]"
            >
              <option value="">Ano</option>
              {options.years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors"
            >
              Filtrar
            </button>
          </div>
        </form>

        {games.length === 0 ? (
          <div className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-12 text-center text-futvar-light">
            Nenhum jogo encontrado com os filtros escolhidos.
            <Link href="/jogos" className="block mt-4 text-futvar-green hover:underline">
              Ver todos os jogos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {games.map((game) => (
              <GameCard
                key={game.id}
                slug={game.slug}
                title={game.title}
                championship={game.championship}
                thumbnailUrl={game.thumbnailUrl}
                gameDate={game.gameDate}
                featured={game.featured}
                homeTeam={game.homeTeam ?? undefined}
                awayTeam={game.awayTeam ?? undefined}
                showAssistir={game.displayMode === 'public_with_media'}
              />
            ))}
          </div>
        )}

        {games.length >= GAMES_PER_PAGE && (
          <p className="mt-8 text-futvar-light text-sm text-center">
            Mostrando os {GAMES_PER_PAGE} mais recentes. Use os filtros para refinar.
          </p>
        )}
      </div>
    </div>
  );
}
