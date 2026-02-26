'use client';

import Link from 'next/link';
import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';

interface Game {
  id: string;
  title: string;
  slug: string;
  championship: string;
  gameDate: string;
  thumbnailUrl: string | null;
  featured: boolean;
  categoryId: string | null;
  category?: { id: string; name: string } | null;
}

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [reordering, setReordering] = useState<string | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [groupByCategory, setGroupByCategory] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  const fetchGames = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (filterCategoryId && filterCategoryId !== '') params.set('categoryId', filterCategoryId);
    const res = await fetch(`/api/admin/games?${params}`);
    if (res.ok) {
      const data = await res.json();
      setGames(data.games ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetch('/api/admin/categories?limit=100').then((r) => r.json()).then((d) => setCategories(Array.isArray(d?.categories) ? d.categories : [])).catch(() => {});
  }, []);

  useEffect(() => setPage(1), [filterCategoryId]);
  useEffect(() => {
    fetchGames();
  }, [page, filterCategoryId]);

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

  const filteredGames = useMemo(() => games, [games]);

  const groupedGames = useMemo(() => {
    if (!groupByCategory) return null;
    const map = new Map<string, Game[]>();
    const semCategoria: Game[] = [];
    for (const g of filteredGames) {
      if (!g.categoryId) {
        semCategoria.push(g);
      } else {
        const key = g.category?.name ?? 'Sem nome';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(g);
      }
    }
    const result: { label: string; games: Game[] }[] = [];
    Array.from(map.entries()).forEach(([name, list]) => {
      result.push({ label: name, games: list });
    });
    if (semCategoria.length > 0) {
      result.push({ label: 'Sem categoria', games: semCategoria });
    }
    return result;
  }, [filteredGames, groupByCategory]);

  const moveGame = async (index: number, direction: 'up' | 'down') => {
    const list = groupedGames ? groupedGames.flatMap((g) => g.games) : filteredGames;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= list.length) return;
    const newOrder = [...list];
    const [removed] = newOrder.splice(index, 1);
    newOrder.splice(newIndex, 0, removed);
    const gameIds = newOrder.map((g) => g.id);
    setReordering(list[index].id);
    try {
      const res = await fetch('/api/admin/games/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameIds }),
      });
      if (res.ok) fetchGames();
    } finally {
      setReordering(null);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  const renderGameRow = (game: Game, index: number, total: number) => (
    <div
      key={game.id}
      className="flex flex-wrap items-center gap-4 bg-netflix-dark border border-white/10 rounded-lg p-4"
    >
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => moveGame(index, 'up')}
          disabled={index === 0 || reordering === game.id}
          className="p-1.5 rounded bg-netflix-gray text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Subir"
          aria-label="Subir posição"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => moveGame(index, 'down')}
          disabled={index === total - 1 || reordering === game.id}
          className="p-1.5 rounded bg-netflix-gray text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
          title="Descer"
          aria-label="Descer posição"
        >
          ▼
        </button>
      </div>
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
        <p className="text-sm text-netflix-light">
          {game.championship} • {formatDate(game.gameDate)}
          {game.category && (
            <span className="ml-2 px-2 py-0.5 rounded bg-white/10 text-xs">{game.category.name}</span>
          )}
        </p>
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
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-white">Jogos</h1>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className="px-3 py-2 rounded bg-netflix-gray border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-netflix-red"
          >
            <option value="">Todas as categorias</option>
            <option value="__none__">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-netflix-light cursor-pointer">
            <input
              type="checkbox"
              checked={groupByCategory}
              onChange={(e) => setGroupByCategory(e.target.checked)}
              className="rounded border-white/30 text-netflix-red focus:ring-netflix-red"
            />
            Agrupar por categoria
          </label>
          <Link
            href="/admin/jogos/novo"
            className="px-4 py-2 rounded bg-netflix-red text-white font-semibold hover:bg-red-600"
          >
            Cadastrar jogo
          </Link>
        </div>
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
      ) : filteredGames.length === 0 ? (
        <div className="bg-netflix-dark border border-white/10 rounded-lg p-12 text-center text-netflix-light">
          {filterCategoryId ? 'Nenhum jogo encontrado para o filtro selecionado.' : 'Nenhum jogo cadastrado.'}{' '}
          {filterCategoryId && (
            <button
              type="button"
              onClick={() => setFilterCategoryId('')}
              className="text-netflix-red hover:underline"
            >
              Limpar filtro
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {groupedGames ? (
              (() => {
                let globalIndex = 0;
                return groupedGames.map((group) => (
                  <div key={group.label}>
                    <h2 className="text-lg font-semibold text-white mb-3">{group.label}</h2>
                    <div className="space-y-4">
                      {group.games.map((game, i) => {
                        const idx = globalIndex++;
                        return renderGameRow(game, idx, filteredGames.length);
                      })}
                    </div>
                  </div>
                ));
              })()
            ) : (
              filteredGames.map((game, index) => renderGameRow(game, index, filteredGames.length))
            )}
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
              <p className="text-sm text-netflix-light">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total} jogos
              </p>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2 rounded bg-netflix-gray text-white text-sm font-medium hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
                <span className="text-sm text-netflix-light px-2">Página {page} de {totalPages}</span>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-4 py-2 rounded bg-netflix-gray text-white text-sm font-medium hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed">Próxima</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
