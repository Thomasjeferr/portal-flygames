'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

type Comment = {
  id: string;
  body: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  user: { id: string; name: string | null; email: string };
  game?: { id: string; title: string; slug: string } | null;
  live?: { id: string; title: string } | null;
  entityType: 'game' | 'live';
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

export default function AdminComentariosPage() {
  const searchParams = useSearchParams();
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'game' | 'live'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [gameIdFilter, setGameIdFilter] = useState<string>('');
  const [liveIdFilter, setLiveIdFilter] = useState<string>('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (gameIdFilter.trim()) params.set('gameId', gameIdFilter.trim());
    if (liveIdFilter.trim()) params.set('liveId', liveIdFilter.trim());
    params.set('page', String(page));
    params.set('limit', '20');
    fetch(`/api/admin/comments?${params}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setComments(d.comments ?? []);
        setTotal(d.total ?? 0);
        setTotalPages(d.totalPages ?? 1);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [typeFilter, statusFilter, gameIdFilter, liveIdFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const t = searchParams.get('type');
    const g = searchParams.get('gameId');
    const l = searchParams.get('liveId');
    if (t === 'game' || t === 'live') setTypeFilter(t);
    if (g) setGameIdFilter(g);
    if (l) setLiveIdFilter(l);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only on mount from URL

  useEffect(() => {
    fetch('/api/admin/comments?status=pending&limit=1', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setPendingCount(d.total ?? 0))
      .catch(() => {});
  }, [comments]);

  const handleStatus = async (id: string, entityType: 'game' | 'live', status: 'approved' | 'rejected') => {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/comments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, entityType }),
      });
      if (res.ok) load();
    } finally {
      setActingId(null);
    }
  };

  const formatDate = (s: string) =>
    new Date(s).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Comentários</h1>
        <p className="text-netflix-light text-sm mt-1">Aprove ou rejeite comentários dos jogos e lives.</p>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value as 'all' | 'game' | 'live'); setPage(1); }}
          className="px-4 py-2 rounded bg-netflix-dark border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-netflix-red"
        >
          <option value="all">Jogos e Lives</option>
          <option value="game">Só jogos</option>
          <option value="live">Só lives</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected'); setPage(1); }}
          className="px-4 py-2 rounded bg-netflix-dark border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-netflix-red"
        >
          <option value="all">Todos</option>
          <option value="pending">Pendentes</option>
          <option value="approved">Aprovados</option>
          <option value="rejected">Rejeitados</option>
        </select>
      </div>

      {loading ? (
        <p className="text-netflix-light">Carregando...</p>
      ) : comments.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-netflix-dark p-12 text-center text-netflix-light">
          Nenhum comentário encontrado com os filtros selecionados.
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-white/10 bg-netflix-dark overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-netflix-light">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Usuário</th>
                  <th className="px-4 py-3 font-medium">Conteúdo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {comments.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 text-netflix-light whitespace-nowrap">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{c.user.name || '—'}</p>
                      <p className="text-netflix-light text-xs">{c.user.email}</p>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-white truncate" title={c.body}>{c.body}</p>
                      <p className="text-netflix-light text-xs mt-1">
                        {c.entityType === 'game' && c.game && (
                          <Link href={`/admin/jogos/${c.game.id}/editar`} className="text-netflix-red hover:underline">
                            Jogo: {c.game.title}
                          </Link>
                        )}
                        {c.entityType === 'live' && c.live && (
                          <Link href={`/admin/lives/${c.live.id}/editar`} className="text-netflix-red hover:underline">
                            Live: {c.live.title}
                          </Link>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          c.status === 'approved'
                            ? 'bg-green-900/50 text-green-300'
                            : c.status === 'rejected'
                            ? 'bg-red-900/30 text-red-300'
                            : 'bg-amber-900/50 text-amber-300'
                        }`}
                      >
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleStatus(c.id, c.entityType, 'approved')}
                            disabled={actingId === c.id}
                            className="px-3 py-1.5 rounded bg-green-900/50 text-green-300 text-xs font-medium hover:bg-green-900 disabled:opacity-50"
                          >
                            {actingId === c.id ? '...' : 'Aprovar'}
                          </button>
                          <button
                            onClick={() => handleStatus(c.id, c.entityType, 'rejected')}
                            disabled={actingId === c.id}
                            className="px-3 py-1.5 rounded bg-red-900/30 text-red-400 text-xs font-medium hover:bg-red-900/50 disabled:opacity-50"
                          >
                            Rejeitar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-netflix-light">
                {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} de {total}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded bg-netflix-gray text-white text-sm disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-netflix-light text-sm px-2 py-2">Página {page} de {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded bg-netflix-gray text-white text-sm disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
