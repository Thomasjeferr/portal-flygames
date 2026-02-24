'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

export function FindGameSection() {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchRef.current?.value?.trim();
    if (q) {
      router.push(`/jogos?q=${encodeURIComponent(q)}`);
    } else {
      router.push('/jogos');
    }
  };

  return (
    <section className="py-10 px-4 lg:px-12 bg-futvar-darker/30">
      <div className="max-w-[1920px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-1 h-8 rounded-full bg-futvar-green" />
          <h2 className="text-xl lg:text-2xl font-bold text-white">
            Encontre um jogo
          </h2>
        </div>
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-2xl">
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar por jogo, time ou campeonato..."
            className="flex-1 px-4 py-3 rounded-lg bg-futvar-dark border border-futvar-green/20 text-white placeholder-futvar-light/60 focus:outline-none focus:ring-2 focus:ring-futvar-green"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors"
          >
            Pesquisar
          </button>
        </form>
        <p className="mt-4 text-futvar-light text-sm">
          <Link href="/jogos" className="text-futvar-green hover:underline font-medium">
            Ver catálogo completo de jogos →
          </Link>
        </p>
      </div>
    </section>
  );
}
