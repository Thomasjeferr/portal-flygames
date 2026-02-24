'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface PreSaleGame {
  id: string;
  title: string;
  status: string;
  thumbnailUrl: string;
  metaEnabled?: boolean;
  metaExtraPerTeam?: number | null;
  specialCategory: { name: string };
  homeTeam?: { name: string; shortName: string | null } | null;
  awayTeam?: { name: string; shortName: string | null } | null;
}

export default function AdminPreEstreiaMetaPage() {
  const [games, setGames] = useState<PreSaleGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (game: PreSaleGame) => {
    if (!confirm(`Excluir o jogo "${game.title}"? Esta ação não pode ser desfeita.`)) return;
    setDeleteError(null);
    setDeletingId(game.id);
    try {
      const res = await fetch(`/api/admin/pre-sale-games/${game.id}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data?.error || 'Erro ao excluir');
        return;
      }
      setGames((prev) => prev.filter((g) => g.id !== game.id));
    } catch {
      setDeleteError('Erro de conexão');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    setLoadError(null);
    fetch('/api/admin/pre-sale-games', { credentials: 'include' })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setLoadError(data?.error || `Falha ao carregar (${r.status})`);
          setGames([]);
          return;
        }
        const list = Array.isArray(data) ? data : [];
        setGames(list.filter((g: PreSaleGame) => g.metaEnabled === true));
      })
      .catch(() => {
        setLoadError('Falha de conexão ao carregar a lista.');
        setGames([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Pré-estreia Meta</h1>
        <div className="flex gap-2">
          <Link href="/admin/pre-estreia-meta/categorias" className="px-4 py-2 rounded bg-netflix-gray text-white font-semibold hover:bg-white/20">
            Categorias
          </Link>
          <Link href="/admin/pre-estreia-meta/novo" className="px-4 py-2 rounded bg-netflix-red text-white font-semibold hover:bg-red-600">
            Novo jogo Meta
          </Link>
        </div>
      </div>
      <p className="text-netflix-light mb-6 max-w-2xl">
        Jogos que liberam quando as torcidas batem a meta de novos assinantes. Mandante e visitante obrigatórios; meta extra por time define quantos assinantes a mais cada time precisa.
      </p>
      {loading ? (
        <p className="text-netflix-light">Carregando...</p>
      ) : loadError ? (
        <div className="bg-netflix-dark border border-white/10 rounded-lg p-8 text-center text-netflix-light">
          <p className="mb-4 text-amber-400">{loadError}</p>
          <button type="button" onClick={() => window.location.reload()} className="text-futvar-green hover:underline">Recarregar</button>
        </div>
      ) : games.length === 0 ? (
        <div className="bg-netflix-dark border border-white/10 rounded-lg p-8 text-center text-netflix-light">
          <p className="mb-4">Nenhum jogo com meta cadastrado.</p>
          <Link href="/admin/pre-estreia-meta/novo" className="text-netflix-red hover:underline">Criar primeiro jogo Meta</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {deleteError && <p className="text-red-400 text-sm mb-2">{deleteError}</p>}
          {games.map((g) => (
            <div key={g.id} className="flex flex-wrap items-center gap-4 bg-netflix-dark border border-white/10 rounded-lg p-4">
              <div className="relative w-24 h-14 rounded overflow-hidden bg-netflix-gray flex-shrink-0">
                <Image src={g.thumbnailUrl} alt="" fill className="object-cover" unoptimized={g.thumbnailUrl?.startsWith('http')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{g.title}</p>
                <p className="text-sm text-netflix-light">
                  {g.specialCategory?.name ?? '—'} • {g.status}
                  {g.homeTeam && g.awayTeam && (
                    <> • {(g.homeTeam.shortName || g.homeTeam.name)} x {(g.awayTeam.shortName || g.awayTeam.name)}</>
                  )}
                  {g.metaExtraPerTeam != null && <> • +{g.metaExtraPerTeam} assinantes/time</>}
                </p>
              </div>
              <Link href={`/admin/pre-estreia-meta/${g.id}`} className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20">Ver</Link>
              <Link href={`/admin/pre-estreia-meta/${g.id}/editar`} className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20">Editar</Link>
              <button
                type="button"
                onClick={() => handleDelete(g)}
                disabled={!!deletingId}
                className="px-3 py-1.5 rounded bg-red-900/50 text-red-300 text-sm hover:bg-red-900/70 disabled:opacity-50"
              >
                {deletingId === g.id ? 'Excluindo...' : 'Deletar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
