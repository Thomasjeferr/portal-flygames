'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const url = search.trim()
      ? `/api/admin/users?q=${encodeURIComponent(search.trim())}`
      : '/api/admin/users';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
    setLoading(false);
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
      )}
    </div>
  );
}
