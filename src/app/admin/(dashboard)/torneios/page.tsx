'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Tournament {
  id: string;
  name: string;
  slug: string;
  season: string | null;
  region: string | null;
  maxTeams: number;
  registrationMode: string;
  status: string;
  bracketStatus: string;
  _count: { teams: number };
}

const PAGE_SIZE = 10;

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchTournaments = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (statusFilter) params.set('status', statusFilter);
    const res = await fetch(`/api/admin/tournaments?${params}`);
    if (res.ok) {
      const data = await res.json();
      setTournaments(data.tournaments ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTournaments();
  }, [page, statusFilter]);

  const statusLabel: Record<string, string> = {
    DRAFT: 'Rascunho',
    PUBLISHED: 'Publicado',
    IN_PROGRESS: 'Em andamento',
    FINISHED: 'Finalizado',
  };
  const modeLabel: Record<string, string> = {
    FREE: 'Grátis',
    PAID: 'Pago',
    GOAL: 'Meta (apoiadores)',
  };

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="text-3xl font-bold text-white">Copa Mata-Mata</h1>
        <Link href="/admin/torneios/novo" className="px-4 py-2 rounded bg-netflix-red text-white font-semibold hover:bg-red-600">
          Novo torneio
        </Link>
      </div>
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-netflix-light">Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded bg-netflix-gray border border-white/20 text-white text-sm"
        >
          <option value="">Todos</option>
          <option value="DRAFT">Rascunho</option>
          <option value="PUBLISHED">Publicado</option>
          <option value="IN_PROGRESS">Em andamento</option>
          <option value="FINISHED">Finalizado</option>
        </select>
      </div>
      {loading ? (
        <p className="text-netflix-light">Carregando...</p>
      ) : tournaments.length === 0 ? (
        <div className="bg-netflix-dark border border-white/10 rounded-lg p-12 text-center text-netflix-light">
          Nenhum torneio. <Link href="/admin/torneios/novo" className="text-netflix-red hover:underline">Criar o primeiro</Link>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center gap-4 bg-netflix-dark border border-white/10 rounded-lg p-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-sm text-netflix-light">
                    {t.slug} • {t.maxTeams} times • {modeLabel[t.registrationMode] ?? t.registrationMode} • {t._count.teams} inscritos
                  </p>
                  <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-white/10 text-netflix-light">
                    {statusLabel[t.status] ?? t.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/admin/torneios/${t.id}`} className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20">
                    Inscrições
                  </Link>
                  <Link href={`/admin/torneios/${t.id}/editar`} className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20">
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
              <p className="text-sm text-netflix-light">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total} torneios
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded bg-netflix-gray text-white text-sm font-medium hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-sm text-netflix-light px-2">Página {page} de {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded bg-netflix-gray text-white text-sm font-medium hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
