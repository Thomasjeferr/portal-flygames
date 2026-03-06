'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

type TeamRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'IGNORED';

type TeamRequestRow = {
  id: string;
  teamName: string;
  city: string | null;
  phone: string | null;
  status: TeamRequestStatus;
  userId: string;
  resolvedAt: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
};

const STATUS_LABELS: Record<TeamRequestStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  RESOLVED: 'Resolvido',
  IGNORED: 'Ignorado',
};

const STATUS_COLORS: Record<TeamRequestStatus, string> = {
  PENDING: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  RESOLVED: 'bg-green-500/20 text-green-300 border-green-500/40',
  IGNORED: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
};

export default function AdminTeamRequestsPage() {
  const [list, setList] = useState<TeamRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TeamRequestStatus | 'ALL'>('ALL');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchList = useCallback(() => {
    setLoading(true);
    const url = filter === 'ALL' ? '/api/admin/team-requests' : `/api/admin/team-requests?status=${filter}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleChangeStatus = async (id: string, newStatus: TeamRequestStatus) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/team-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setList((prev) => prev.map((r) => (r.id === id ? updated : r)));
      }
    } catch {
      // ignorar
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta solicitação?')) return;
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/team-requests/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setList((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      // ignorar
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      });
    } catch {
      return s;
    }
  };

  const pendingCount = list.filter((r) => r.status === 'PENDING').length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Solicitações de cadastro de time</h1>
          <p className="text-netflix-light text-sm mt-1">
            Torcedores que não encontraram o time e pediram para cadastrar. Use para priorizar novos times.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'ALL' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
          }`}
        >
          Todos
        </button>
        {(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'] as TeamRequestStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s ? 'bg-white/20 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-netflix-light">Carregando...</p>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-netflix-light">
          {filter === 'ALL' ? 'Nenhuma solicitação ainda.' : `Nenhuma solicitação com status "${STATUS_LABELS[filter as TeamRequestStatus]}".`}
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[800px]">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium text-white">Data</th>
                <th className="px-4 py-3 font-medium text-white">Nome do time</th>
                <th className="px-4 py-3 font-medium text-white">Cidade</th>
                <th className="px-4 py-3 font-medium text-white">Telefone</th>
                <th className="px-4 py-3 font-medium text-white">Usuário</th>
                <th className="px-4 py-3 font-medium text-white">Status</th>
                <th className="px-4 py-3 font-medium text-white">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {list.map((row) => (
                <tr key={row.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-netflix-light whitespace-nowrap">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3 text-white font-medium">{row.teamName}</td>
                  <td className="px-4 py-3 text-netflix-light">{row.city || '—'}</td>
                  <td className="px-4 py-3 text-netflix-light">
                    {row.phone ? (
                      <a
                        href={`https://wa.me/${row.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-400 hover:underline"
                      >
                        {row.phone}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-netflix-light">
                    <div>
                      <span className="text-white">{row.user.name || '—'}</span>
                      <br />
                      <a href={`mailto:${row.user.email}`} className="text-futvar-green hover:underline text-xs">
                        {row.user.email}
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={row.status}
                      onChange={(e) => handleChangeStatus(row.id, e.target.value as TeamRequestStatus)}
                      disabled={updating === row.id}
                      className={`px-2 py-1 rounded border text-xs font-medium ${STATUS_COLORS[row.status]} bg-transparent cursor-pointer disabled:opacity-50`}
                    >
                      {(['PENDING', 'IN_PROGRESS', 'RESOLVED', 'IGNORED'] as TeamRequestStatus[]).map((s) => (
                        <option key={s} value={s} className="bg-gray-800 text-white">
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/times/novo?teamName=${encodeURIComponent(row.teamName)}`}
                        className="px-2 py-1 rounded bg-futvar-green/20 text-futvar-green text-xs font-medium hover:bg-futvar-green/30"
                      >
                        Cadastrar time
                      </Link>
                      <button
                        onClick={() => handleDelete(row.id)}
                        disabled={updating === row.id}
                        className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 disabled:opacity-50"
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
      )}
    </div>
  );
}
