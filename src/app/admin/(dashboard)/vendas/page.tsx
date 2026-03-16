'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { AdminTable } from '@/components/admin/AdminTable';

const PAGE_SIZE = 20;

type VendaItem = {
  id: string;
  type: 'plan' | 'pre_sale';
  date: string;
  whoName: string;
  whoEmail: string | null;
  valueCents: number;
  gateway: string | null;
  description: string;
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

export default function AdminVendasPage() {
  const [items, setItems] = useState<VendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [period, setPeriod] = useState<string>('this_month');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchVendas = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PAGE_SIZE),
      period,
      type: typeFilter,
    });
    const res = await fetch(`/api/admin/vendas?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    }
    setLoading(false);
  }, [page, period, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [period, typeFilter]);

  useEffect(() => {
    fetchVendas();
  }, [fetchVendas]);

  const exportCsv = async () => {
    const params = new URLSearchParams({
      page: '1',
      limit: '1000',
      period,
      type: typeFilter,
    });
    const res = await fetch(`/api/admin/vendas?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    const rows = (data.items ?? []) as VendaItem[];
    const headers = ['Data', 'Tipo', 'Quem comprou/pagou', 'E-mail', 'Valor (R$)', 'Gateway', 'Descrição'];
    const lines = [
      headers.join(';'),
      ...rows.map((r) =>
        [
          formatDate(r.date),
          r.type === 'plan' ? 'Plano/Jogo' : 'Pré-estreia',
          r.whoName,
          r.whoEmail ?? '',
          (r.valueCents / 100).toFixed(2).replace('.', ','),
          r.gateway ?? '',
          r.description.replace(/;/g, ','),
        ].join(';')
      ),
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendas-aprovadas-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Vendas aprovadas</h1>
          <p className="mt-1 text-gray-400">Quem comprou, quem pagou e valores das vendas aprovadas</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#111827] border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="this_month">Mês atual</option>
            <option value="last_month">Mês anterior</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-[#111827] border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todos</option>
            <option value="plan">Planos / Jogos</option>
            <option value="pre_sale">Pré-estreia</option>
          </select>
          <button
            type="button"
            onClick={exportCsv}
            className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm font-medium border border-white/20 hover:bg-white/20 transition-colors"
          >
            Exportar CSV
          </button>
          <Link
            href="/admin"
            className="px-4 py-2 rounded-lg border border-white/20 text-gray-300 text-sm hover:bg-white/10 transition-colors"
          >
            Voltar ao dashboard
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">Carregando...</p>
      ) : (
        <>
          <AdminTable
            columns={[
              {
                key: 'date',
                header: 'Data',
                render: (r) => <span className="text-gray-300">{formatDate(r.date)}</span>,
              },
              {
                key: 'type',
                header: 'Tipo',
                render: (r) => (
                  <span
                    className={
                      r.type === 'plan'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }
                  >
                    {r.type === 'plan' ? 'Plano/Jogo' : 'Pré-estreia'}
                  </span>
                ),
              },
              {
                key: 'whoName',
                header: 'Quem comprou/pagou',
                render: (r) => (
                  <div>
                    <p className="font-medium text-white">{r.whoName}</p>
                    {r.whoEmail && (
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">{r.whoEmail}</p>
                    )}
                  </div>
                ),
              },
              {
                key: 'valueCents',
                header: 'Valor',
                render: (r) => (
                  <span className="text-emerald-400 font-medium">
                    {formatCurrency(r.valueCents)}
                  </span>
                ),
              },
              {
                key: 'gateway',
                header: 'Gateway',
                render: (r) => <span className="text-gray-400">{r.gateway ?? '—'}</span>,
              },
              {
                key: 'description',
                header: 'Descrição',
                render: (r) => <span className="text-gray-300 truncate max-w-[180px] block">{r.description}</span>,
              },
            ]}
            data={items}
            keyExtractor={(r) => r.id}
            emptyMessage="Nenhuma venda aprovada no período."
          />

          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
              <p className="text-sm text-gray-400">
                {total === 0
                  ? 'Nenhuma venda'
                  : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} de ${total} vendas`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-lg bg-[#111827] border border-white/20 text-white text-sm font-medium hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-400 px-2">
                  Página {page} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-lg bg-[#111827] border border-white/20 text-white text-sm font-medium hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
