'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

const PAGE_SIZE = 10;

interface Subscription {
  id: string;
  active: boolean;
  startDate: string;
  endDate: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  subscription: Subscription | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set('q', search.trim());
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    const res = await fetch(`/api/admin/users?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    }
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const isSubscriptionActive = (sub: Subscription | null) => {
    if (!sub) return false;
    return sub.active && new Date(sub.endDate) >= new Date();
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-white">Usuários</h1>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email ou nome..."
          className="w-full sm:w-72 px-4 py-2 rounded bg-netflix-dark border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
        />
      </div>

      {loading ? (
        <p className="text-netflix-light">Carregando...</p>
      ) : users.length === 0 ? (
        <div className="bg-netflix-dark border border-white/10 rounded-lg p-12 text-center text-netflix-light">
          {search.trim()
            ? 'Nenhum usuário encontrado para essa busca.'
            : 'Nenhum usuário cadastrado.'}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {users.map((user) => {
              const subActive = isSubscriptionActive(user.subscription);
              return (
                <div
                  key={user.id}
                  className="flex flex-wrap items-center gap-4 bg-netflix-dark border border-white/10 rounded-lg p-4"
                >
                  <div className="w-12 h-12 rounded-full bg-netflix-gray flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">
                      {user.name || 'Sem nome'}
                    </p>
                    <p className="text-sm text-netflix-light truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-amber-900/50 text-amber-300'
                            : 'bg-netflix-gray text-netflix-light'
                        }`}
                      >
                        {user.role === 'admin' ? 'Admin' : 'Usuário'}
                      </span>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          subActive ? 'bg-green-900/50 text-green-300' : 'bg-red-900/30 text-red-300'
                        }`}
                      >
                        {subActive ? 'Assinatura ativa' : 'Sem assinatura'}
                      </span>
                      <span className="text-xs text-netflix-light">
                        Cadastro: {formatDate(user.createdAt)}
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/admin/usuarios/${user.id}`}
                    className="px-4 py-2 rounded bg-netflix-gray text-white text-sm font-medium hover:bg-white/20 transition-colors"
                  >
                    Gerenciar
                  </Link>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
              <p className="text-sm text-netflix-light">
                {total === 0
                  ? 'Nenhum usuário'
                  : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} de ${total} usuários`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded bg-netflix-gray text-white text-sm font-medium hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-netflix-light px-2">
                  Página {page} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded bg-netflix-gray text-white text-sm font-medium hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
