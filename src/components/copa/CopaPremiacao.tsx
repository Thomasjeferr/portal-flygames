'use client';

import type { CopaPremiacaoProps } from './types';

function formatPremio(v: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(v);
}

const MEDAL_STYLES = [
  { label: '1º LUGAR', bg: 'from-amber-400 via-yellow-500 to-amber-600', ring: 'ring-amber-400/50', text: 'text-amber-950' },
  { label: '2º LUGAR', bg: 'from-slate-300 via-slate-400 to-slate-500', ring: 'ring-slate-400/50', text: 'text-slate-900' },
  { label: '3º LUGAR', bg: 'from-amber-600 via-amber-700 to-amber-800', ring: 'ring-amber-700/50', text: 'text-amber-100' },
  { label: '4º LUGAR', bg: 'from-slate-600 via-slate-700 to-slate-800', ring: 'ring-slate-500/50', text: 'text-slate-200' },
] as const;

export function CopaPremiacao({
  premiacaoTipo,
  premio1,
  premio2,
  premio3,
  premio4,
  trofeus,
}: CopaPremiacaoProps) {
  const premios = [
    { value: premio1, ...MEDAL_STYLES[0] },
    { value: premio2, ...MEDAL_STYLES[1] },
    { value: premio3, ...MEDAL_STYLES[2] },
    { value: premio4, ...MEDAL_STYLES[3] },
  ].filter((p) => p.value != null) as { value: number; label: string; bg: string; ring: string; text: string }[];

  const hasMoney = premios.length > 0;
  const hasTrofeus = trofeus.length > 0;

  return (
    <section className="relative w-full overflow-hidden px-4 lg:px-12 py-10 lg:py-14">
      {/* Fundo com leve brilho verde/laranja nos cantos (estilo imagem 3) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        aria-hidden
      >
        <div className="absolute top-0 left-0 w-64 h-64 bg-futvar-green/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-0 right-0 w-48 h-48 bg-futvar-gold/15 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* Headline PREMIAÇÃO + ícone troféu com glow */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-8">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-2xl bg-futvar-dark/80 border border-white/10 shadow-[0_0_30px_rgba(34,197,94,0.35)]"
            aria-hidden
          >
            <span className="text-4xl drop-shadow-lg">🏆</span>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-futvar-gold to-amber-400 tracking-tight">
              PREMIAÇÃO
            </h2>
            {premiacaoTipo && (
              <p className="text-futvar-light text-sm mt-1 max-w-md">{premiacaoTipo}</p>
            )}
          </div>
        </div>

        {/* Prêmios em dinheiro - sublinhado */}
        {hasMoney && (
          <div className="mb-8">
            <p className="text-center text-white font-semibold text-lg mb-1">
              Prêmios em dinheiro
            </p>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-futvar-gold to-transparent mx-auto rounded-full mb-8" />

            {/* Cards horizontais com medalhas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {premios.map((p, i) => (
                <div
                  key={p.label}
                  className="relative rounded-2xl border border-amber-500/20 bg-futvar-dark/90 backdrop-blur-sm p-6 shadow-lg hover:shadow-amber-500/10 hover:border-amber-500/30 transition-all duration-300"
                  style={{ animationDelay: `${i * 75}ms` }}
                >
                  {/* Medalha circular */}
                  <div
                    className={`mx-auto w-16 h-16 rounded-full bg-gradient-to-br ${p.bg} ring-4 ${p.ring} flex items-center justify-center mb-4 shadow-inner`}
                  >
                    <span className={`text-xl font-black ${p.text}`}>{i + 1}</span>
                  </div>
                  <p className="text-futvar-light text-xs font-medium uppercase tracking-wider text-center mb-1">
                    {p.label}
                  </p>
                  <p className="text-center text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-futvar-gold">
                    {formatPremio(p.value)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Troféus */}
        {hasTrofeus && (
          <div className="pt-6 border-t border-white/10">
            <p className="text-white font-semibold text-base mb-3 flex items-center gap-2">
              <span className="text-futvar-gold" aria-hidden>🏆</span>
              Troféus
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {trofeus.map((nome, i) => (
                <li
                  key={nome}
                  className="flex items-center gap-2 text-futvar-green font-medium"
                >
                  <span className="text-futvar-gold text-sm" aria-hidden>🏆</span>
                  <span>{nome}</span>
                  {i < trofeus.length - 1 && (
                    <span className="text-white/30 select-none">•</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
