'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface Game {
  id: string;
  title: string;
  slug: string;
  championship: string;
  gameDate: string;
  thumbnailUrl: string | null;
  featured: boolean;
}

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchGames = async () => {
    const res = await fetch('/api/admin/games');
    if (res.ok) {
      const data = await res.json();
      setGames(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Excluir "${title}"?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/games/${id}`, { method: 'DELETE' });
      if (res.ok) fetchGames();
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Jogos</h1>
        <Link
          href="/admin/jogos/novo"
          className="px-4 py-2 rounded bg-netflix-red text-white font-semibold hover:bg-red-600"
        >
          Cadastrar jogo
        </Link>
      </div>

      {loading ? (
        <p className="text-netflix-light">Carregando...</p>
      ) : games.length === 0 ? (
        <div className="bg-netflix-dark border border-white/10 rounded-lg p-12 text-center text-netflix-light">
          Nenhum jogo cadastrado.{' '}
          <Link href="/admin/jogos/novo" className="text-netflix-red hover:underline">
            Cadastrar o primeiro
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {games.map((game) => (
            <div
              key={game.id}
              className="flex flex-wrap items-center gap-4 bg-netflix-dark border border-white/10 rounded-lg p-4"
            >
              <div className="relative w-24 h-14 rounded overflow-hidden bg-netflix-gray flex-shrink-0">
                {game.thumbnailUrl ? (
                  <Image
                    src={game.thumbnailUrl.startsWith('http') ? game.thumbnailUrl : game.thumbnailUrl}
                    alt=""
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-2xl text-netflix-light">▶</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{game.title}</p>
                <p className="text-sm text-netflix-light">{game.championship} • {formatDate(game.gameDate)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/jogos/${game.id}/editar`}
                  className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
                >
                  Editar
                </Link>
                <button
                  onClick={() => handleDelete(game.id, game.title)}
                  disabled={deleting === game.id}
                  className="px-3 py-1.5 rounded bg-red-900/50 text-red-300 text-sm hover:bg-red-900 disabled:opacity-50"
                >
                  {deleting === game.id ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
