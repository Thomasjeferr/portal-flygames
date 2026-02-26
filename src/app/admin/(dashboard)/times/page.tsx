'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useCallback } from 'react';

type Team = {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  city: string | null;
  state: string | null;
  crestUrl: string | null;
  isActive: boolean;
  approvalStatus?: 'approved' | 'pending' | 'rejected';
};

function isValidCrestUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const s = url.trim();
  return s.length > 0 && (s.startsWith('http') || s.startsWith('/') || s.startsWith('data:'));
}

export default function AdminTimesPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [crestErrors, setCrestErrors] = useState<Set<string>>(new Set());

  const onCrestError = useCallback((id: string) => {
    setCrestErrors((prev) => new Set(prev).add(id));
  }, []);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 10;

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    if (filterActive === 'active') params.set('active', 'true');
    if (filterActive === 'inactive') params.set('active', 'false');
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    fetch(`/api/admin/teams?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setTeams(d.teams ?? []);
        setTotal(d.total ?? 0);
        setTotalPages(d.totalPages ?? 1);
      })
      .catch(() => { setTeams([]); setTotal(0); setTotalPages(1); })
      .finally(() => setLoading(false));
  };

  useEffect(() => setPage(1), [search, filterActive]);
  useEffect(() => { load(); }, [search, filterActive, page]);

  const handleToggle = async (id: string) => {
    const res = await fetch(`/api/admin/teams/${id}/toggle`, { method: 'POST' });
    if (res.ok) load();
  };

  const handleDelete = async (id: string, name: string, isActive: boolean) => {
    const actionLabel = isActive ? 'desativar' : 'excluir PERMANENTEMENTE';
    const extra =
      isActive ? '' : '\n\nEsta ação não pode ser desfeita e removerá o time definitivamente.';
    if (!confirm(`Tem certeza que deseja ${actionLabel} o time "${name}"?${extra}`)) return;
    const res = await fetch(`/api/admin/teams/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  const cityState = (t: Team) => [t.city, t.state].filter(Boolean).join(' / ') || '—';

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-10 text-netflix-light">Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold text-white">Times</h1>
        <Link
          href="/admin/times/novo"
          className="px-4 py-2 rounded bg-netflix-red text-white font-semibold hover:bg-red-600"
        >
          Novo time
        </Link>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, cidade, sigla..."
          className="px-4 py-2 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red w-64"
        />
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
          className="px-4 py-2 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
        >
          <option value="all">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-netflix-dark p-12 text-center">
          <p className="text-netflix-light mb-4">Nenhum time cadastrado.</p>
          <Link href="/admin/times/novo" className="text-netflix-red hover:underline">
            Cadastrar primeiro time
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-netflix-dark">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-netflix-light text-sm">
              <tr>
                <th className="px-4 py-3 font-medium">Escudo</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Cidade/UF</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Comissões</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {teams.map((t) => (
                <tr key={t.id} className="hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="relative w-12 h-12 rounded overflow-hidden bg-white/5 flex items-center justify-center">
                      {isValidCrestUrl(t.crestUrl) && !crestErrors.has(t.id) ? (
                        <Image
                          src={t.crestUrl!.startsWith('/') ? t.crestUrl! : t.crestUrl!}
                          alt={t.name}
                          fill
                          className="object-contain"
                          sizes="48px"
                          unoptimized={t.crestUrl!.startsWith('http')}
                          onError={() => onCrestError(t.id)}
                        />
                      ) : (
                        <span className="text-netflix-light text-xs">Escudo</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">
                    {t.name}
                    {t.shortName && <span className="text-netflix-light ml-2">({t.shortName})</span>}
                  </td>
                  <td className="px-4 py-3 text-netflix-light">{cityState(t)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={
                        t.approvalStatus === 'approved'
                          ? 'text-futvar-green'
                          : t.approvalStatus === 'pending'
                          ? 'text-amber-300'
                          : 'text-netflix-light'
                      }
                    >
                      {t.approvalStatus === 'approved'
                        ? 'Aprovado'
                        : t.approvalStatus === 'pending'
                        ? 'Pendente'
                        : 'Rejeitado'}
                    </span>
                    <span className="text-netflix-light text-xs block">
                      Ativo: {t.isActive ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/times/${t.id}/comissoes`}
                      className="text-netflix-red hover:underline text-sm"
                    >
                      Ver comissões
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/times/${t.id}/editar`}
                        className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => handleToggle(t.id)}
                        className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
                      >
                        {t.isActive ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name, t.isActive)}
                        className="px-3 py-1.5 rounded bg-red-900/30 text-red-400 text-sm hover:bg-red-900/50"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
            <p className="text-sm text-netflix-light">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total} times
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2 rounded bg-netflix-gray text-white text-sm font-medium hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
              <span className="text-sm text-netflix-light px-2">Página {page} de {totalPages}</span>
              <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-4 py-2 rounded bg-netflix-gray text-white text-sm font-medium hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed">Próxima</button>
            </div>
          </div>
        )}
      )}
    </div>
  );
}
