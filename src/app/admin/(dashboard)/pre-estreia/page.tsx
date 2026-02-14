'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface PreSaleGame {
  id: string;
  title: string;
  status: string;
  thumbnailUrl: string;
  fundedClubsCount: number;
  specialCategory: { name: string };
}

export default function AdminPreEstreiaPage() {
  const [games, setGames] = useState<PreSaleGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/pre-sale-games')
      .then((r) => r.json())
      .then((data) => setGames(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Pre-estreia Clubes</h1>
        <div className="flex gap-2">
          <Link href="/admin/pre-estreia/categorias" className="px-4 py-2 rounded bg-netflix-gray text-white font-semibold hover:bg-white/20">Categorias</Link>
          <Link href="/admin/pre-estreia/novo" className="px-4 py-2 rounded bg-netflix-red text-white font-semibold hover:bg-red-600">Novo jogo</Link>
        </div>
      </div>
      {loading ? <p className="text-netflix-light">Carregando...</p> : games.length === 0 ? (
        <div className="bg-netflix-dark border border-white/10 rounded-lg p-8 text-center text-netflix-light">
          <p className="mb-4">Nenhum jogo cadastrado.</p>
          <Link href="/admin/pre-estreia/novo" className="text-netflix-red hover:underline">Criar primeiro jogo</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {games.map((g) => (
            <div key={g.id} className="flex flex-wrap items-center gap-4 bg-netflix-dark border border-white/10 rounded-lg p-4">
              <div className="relative w-24 h-14 rounded overflow-hidden bg-netflix-gray flex-shrink-0">
                <Image src={g.thumbnailUrl} alt="" fill className="object-cover" unoptimized={g.thumbnailUrl.startsWith('http')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{g.title}</p>
                <p className="text-sm text-netflix-light">{g.specialCategory?.name} • {g.status} • {g.fundedClubsCount}/2</p>
              </div>
              <Link href={`/admin/pre-estreia/${g.id}`} className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20">Ver</Link>
              <Link href={`/admin/pre-estreia/${g.id}/editar`} className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20">Editar</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
