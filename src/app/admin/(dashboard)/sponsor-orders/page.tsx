'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SponsorOrder {
  id: string;
  companyName: string;
  email: string;
  websiteUrl: string | null;
  whatsapp: string | null;
  instagram: string | null;
  logoUrl: string;
  amountCents: number;
  createdAt: string;
  paymentStatus: string;
  sponsorPlan: { name: string; price: number; teamPayoutPercent: number };
  team: { id: string; name: string } | null;
}

interface Team {
  id: string;
  name: string;
}

const PAGE_SIZE = 10;

export default function AdminSponsorOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<SponsorOrder[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ missingTeam: 'true', page: String(page), limit: String(PAGE_SIZE) });
    Promise.all([
      fetch(`/api/admin/sponsor-orders?${params}`),
      fetch('/api/public/teams', { cache: 'no-store' }),
    ])
      .then(async ([ordersRes, teamsRes]) => {
        if (ordersRes.status === 401 || ordersRes.status === 403) {
          router.replace('/admin/entrar');
          return;
        }
        const ordersData = await ordersRes.json();
        const teamsData = await teamsRes.json().catch(() => []);
        if (ordersData?.orders) {
          setOrders(ordersData.orders);
          setTotal(ordersData.total ?? 0);
          setTotalPages(ordersData.totalPages ?? 1);
        } else if (ordersData?.error) {
          setError(ordersData.error);
        }
        if (Array.isArray(teamsData)) {
          setTeams(teamsData);
        }
      })
      .catch(() => setError('Erro ao carregar pedidos de patrocínio.'))
      .finally(() => setLoading(false));
  }, [router, page]);

  const handleAssignTeam = async (orderId: string, teamId: string) => {
    if (!teamId) return;
    setSavingId(orderId);
    try {
      const res = await fetch(`/api/admin/sponsor-orders/${orderId}/assign-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao vincular time.');
        return;
      }
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch {
      alert('Erro de conexão ao vincular time.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Pedidos de patrocínio sem time</h1>
      </div>
      {loading ? (
        <p className="text-netflix-light">Carregando...</p>
      ) : error ? (
        <p className="text-netflix-red text-sm">{error}</p>
      ) : orders.length === 0 ? (
        <p className="text-netflix-light text-sm">Nenhum pedido pago pendente de time.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-netflix-dark">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-netflix-light">
              <tr>
                <th className="px-4 py-2 text-left">Empresa</th>
                <th className="px-4 py-2 text-left">Plano</th>
                <th className="px-4 py-2 text-left">Valor</th>
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-left">Instagram / Site / WhatsApp</th>
                <th className="px-4 py-2 text-left">Time</th>
                <th className="px-4 py-2 text-left">Ação</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-white/5">
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className="text-white font-medium">{o.companyName}</span>
                      <span className="text-xs text-netflix-light">{o.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-netflix-light">
                    {o.sponsorPlan?.name ?? '-'}
                  </td>
                  <td className="px-4 py-2 text-netflix-light">
                    R$ {(o.amountCents / 100).toFixed(2).replace('.', ',')}
                  </td>
                  <td className="px-4 py-2 text-netflix-light">
                    {new Date(o.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-2 text-netflix-light text-xs max-w-[180px]">
                    <div className="flex flex-col gap-0.5">
                      {o.instagram && (
                        <span title={o.instagram}>
                          IG: {o.instagram.length > 25 ? o.instagram.slice(0, 22) + '…' : o.instagram}
                        </span>
                      )}
                      {o.websiteUrl && (
                        <a href={o.websiteUrl.startsWith('http') ? o.websiteUrl : `https://${o.websiteUrl}`} target="_blank" rel="noopener noreferrer" className="text-netflix-red hover:underline truncate block">
                          Site
                        </a>
                      )}
                      {o.whatsapp && (
                        <a href={`https://wa.me/55${o.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
                          WA
                        </a>
                      )}
                      {!o.instagram && !o.websiteUrl && !o.whatsapp && '—'}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-netflix-light">
                    {o.team?.name ?? '—'}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      defaultValue=""
                      disabled={savingId === o.id || teams.length === 0}
                      onChange={(e) => handleAssignTeam(o.id, e.target.value || '')}
                      className="px-3 py-1 rounded bg-netflix-gray border border-white/20 text-xs text-white focus:outline-none focus:ring-1 focus:ring-netflix-red"
                    >
                      <option value="">Vincular time...</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !error && orders.length > 0 && totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
          <p className="text-sm text-netflix-light">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total} pedidos
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2 rounded bg-netflix-gray text-white text-sm font-medium hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
            <span className="text-sm text-netflix-light px-2">Página {page} de {totalPages}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-4 py-2 rounded bg-netflix-gray text-white text-sm font-medium hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed">Próxima</button>
          </div>
        </div>
      )}
    </div>
  );
}

