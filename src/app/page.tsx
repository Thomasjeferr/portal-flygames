import Link from 'next/link';
import { GameCard } from '@/components/GameCard';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function getGames(): Promise<Array<{ id: string; title: string; slug: string; championship: string; gameDate: string; thumbnailUrl: string | null; featured: boolean }>> {
  try {
    const games = await prisma.game.findMany({
      orderBy: [{ featured: 'desc' }, { gameDate: 'desc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        championship: true,
        gameDate: true,
        thumbnailUrl: true,
        featured: true,
      },
    });
    return games.map((g) => ({ ...g, gameDate: g.gameDate.toISOString() }));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const games = await getGames();
  const featured = games.filter((g) => g.featured);
  const others = games.filter((g) => !g.featured);

  return (
    <div className="min-h-screen">
      {/* Hero Section - visual futebol */}
      <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 px-4 lg:px-12 overflow-hidden">
        <div className="absolute inset-0 bg-hero-pattern field-pattern" />
        <div className="absolute inset-0 bg-grass-gradient" />
        <div className="relative max-w-[1920px] mx-auto">
          <div className="max-w-3xl">
            <span className="inline-block px-4 py-1.5 rounded-full bg-futvar-green/20 text-futvar-green text-sm font-semibold mb-6 border border-futvar-green/30">
              FILMAGEM COM DRONES
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Futebol de várzea
              <span className="block text-futvar-green">visão aérea</span>
            </h1>
            <p className="text-lg sm:text-xl text-futvar-light mb-8 max-w-xl">
              Assista às melhores partidas filmadas com drones. 
              Cada lance com a emoção de quem está em campo — do céu.
            </p>
            <div className="flex flex-wrap gap-4">
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
          {featured.length > 0 && (
            <div className="mb-14">
              <div className="flex items-center gap-3 mb-6">
                <span className="w-1 h-8 rounded-full bg-futvar-gold" />
                <h2 className="text-2xl lg:text-3xl font-bold text-white">
                  Principais jogos
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {featured.map((game) => (
                  <GameCard key={game.slug} {...game} />
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="w-1 h-8 rounded-full bg-futvar-green" />
              <h2 className="text-2xl lg:text-3xl font-bold text-white">
                {featured.length > 0 ? 'Todos os jogos' : 'Jogos disponíveis'}
              </h2>
            </div>
            {games.length === 0 ? (
              <div className="text-center py-24 rounded-2xl border-2 border-dashed border-futvar-green/20 bg-futvar-green/5">
                <div className="text-6xl mb-4">⚽</div>
                <p className="text-xl text-futvar-light font-medium">Nenhum jogo disponível no momento.</p>
                <p className="mt-2 text-futvar-light/80">Em breve teremos transmissões incríveis para você assistir.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                {(featured.length > 0 ? others : games).map((game) => (
                  <GameCard key={game.slug} {...game} featured={game.featured} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4 lg:px-12 mt-8">
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
