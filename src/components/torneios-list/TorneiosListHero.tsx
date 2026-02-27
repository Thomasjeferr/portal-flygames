import Link from 'next/link';

const currentYear = new Date().getFullYear();

export function TorneiosListHero({ isAdmin }: { isAdmin: boolean }) {
  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-futvar-darker via-futvar-darker to-futvar-darker bg-hero-pattern pt-24 pb-16 px-4 lg:px-12">
      <div className="max-w-4xl mx-auto text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-futvar-green hover:text-futvar-green-light text-sm font-semibold mb-8 transition-colors"
        >
          ← Voltar ao início
        </Link>
        <div className="inline-block px-3 py-1 rounded-full bg-futvar-green/15 border border-futvar-green/30 text-futvar-green text-xs font-semibold mb-6">
          Temporada {currentYear}
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
          Campeonatos Oficiais FlyGames
        </h1>
        <p className="text-lg sm:text-xl text-futvar-light mb-3 max-w-2xl mx-auto">
          Acompanhe, apoie e participe dos torneios da sua região.
        </p>
        <p className="text-sm text-futvar-light/90 mb-10 max-w-xl mx-auto">
          Cada campeonato possui metas, ranking de ativação e chaveamento oficial.
        </p>
        {isAdmin ? (
          <Link
            href="/admin/torneios/novo"
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-futvar-green text-futvar-darker font-bold text-base hover:bg-futvar-green-light transition-all duration-200 shadow-lg shadow-futvar-green/20"
          >
            Criar Campeonato
          </Link>
        ) : (
          <a
            href="#campeonatos"
            className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-futvar-green text-futvar-darker font-bold text-base hover:bg-futvar-green-light transition-all duration-200 shadow-lg shadow-futvar-green/20"
          >
            Ver Campeonatos Ativos
          </a>
        )}
      </div>
    </section>
  );
}
