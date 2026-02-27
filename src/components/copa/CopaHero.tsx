import Link from 'next/link';
import type { CopaHeroProps } from './types';

export function CopaHero({
  name,
  season,
  maxTeams,
  confirmedCount,
  goalRequired,
  goalPrice,
  isGoalMode,
  slug,
  firstTeamInGoalId,
}: CopaHeroProps) {
  const priceFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goalPrice);

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-b from-futvar-darker via-futvar-darker to-futvar-darker bg-hero-pattern pt-24 pb-16 px-4 lg:px-12">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/torneios"
          className="inline-flex items-center gap-2 text-futvar-green hover:text-futvar-green-light text-sm font-semibold mb-8 transition-colors"
        >
          ← Voltar aos torneios
        </Link>
      </div>
      <div className="max-w-5xl mx-auto text-center">
        <div className="inline-block px-4 py-1.5 rounded-full bg-futvar-green/15 border border-futvar-green/30 text-futvar-green text-sm font-semibold mb-6">
          {season ?? 'Copa'}
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tight">
          {name}
        </h1>
        <p className="text-futvar-light text-lg sm:text-xl mb-10 max-w-xl mx-auto">
          Ative sua torcida. Garanta sua vaga na Copa.
        </p>

        <div className="flex flex-wrap justify-center gap-6 sm:gap-10 text-futvar-light text-sm sm:text-base mb-10">
          <span className="inline-flex items-center gap-2">
            <span className="text-futvar-green">🏆</span>
            {maxTeams} vagas
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="text-futvar-green">🔥</span>
            {confirmedCount} confirmados
          </span>
          {isGoalMode && (
            <>
              <span className="inline-flex items-center gap-2">
                <span className="text-futvar-green">🎯</span>
                Meta: {goalRequired} apoiadores
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="text-futvar-green">💰</span>
                {priceFormatted}/mês
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {isGoalMode && firstTeamInGoalId ? (
            <Link
              href={`/torneios/${slug}/apoiar?teamId=${firstTeamInGoalId}`}
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-futvar-green text-futvar-darker font-bold text-base sm:text-lg hover:bg-futvar-green-light transition-all duration-200 shadow-lg shadow-futvar-green/20 hover:shadow-futvar-green/30 hover:scale-[1.02]"
            >
              Apoiar um time
            </Link>
          ) : (
            <span className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-futvar-gray text-futvar-light font-semibold cursor-not-allowed">
              Apoiar um time
            </span>
          )}
          <Link
            href="#chaveamento"
            className="inline-flex items-center justify-center px-6 py-4 rounded-xl border-2 border-futvar-green/50 text-futvar-green font-bold text-base hover:bg-futvar-green/10 transition-all duration-200"
          >
            Ver regulamento
          </Link>
        </div>
      </div>
    </section>
  );
}
