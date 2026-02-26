'use client';

import { useEffect, useState } from 'react';

type TeamRequestRow = {
  id: string;
  teamName: string | null;
  userId: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null } | null;
};

export default function AdminTeamRequestsPage() {
  const [list, setList] = useState<TeamRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/team-requests')
      .then((r) => r.json())
      .then((data) => setList(Array.isArray(data) ? data : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return s;
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-white mb-4">Solicitações de cadastro de time</h1>
      <p className="text-netflix-light text-sm mb-6">
        Torcedores que não encontraram o time na lista e pediram para o portal ou para o responsável cadastrar. Use para priorizar novos times.
      </p>

      {loading ? (
        <p className="text-netflix-light">Carregando...</p>
      ) : list.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center text-netflix-light">
          Nenhuma solicitação ainda.
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-medium text-white">Data</th>
                <th className="px-4 py-3 font-medium text-white">Nome do time (se informado)</th>
                <th className="px-4 py-3 font-medium text-white">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {list.map((row) => (
                <tr key={row.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-netflix-light">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3 text-white">{row.teamName || '—'}</td>
                  <td className="px-4 py-3 text-netflix-light">
                    {row.user ? (
                      <span title={row.user.id}>
                        {row.user.name || row.user.email}
                        {row.user.name && row.user.email && ` (${row.user.email})`}
                      </span>
                    ) : (
                      'Anônimo'
                    )}
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
