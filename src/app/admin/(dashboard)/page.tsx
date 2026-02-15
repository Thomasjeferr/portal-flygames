'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminKpiCard } from '@/components/admin/AdminKpiCard';
import { AdminLineChart } from '@/components/admin/AdminLineChart';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminAlerts } from '@/components/admin/AdminAlerts';

type DashboardData = {
  kpis: {
    usersToday: number;
    users7d: number;
    activeSubsMonthly: number;
    activeSubsAnnual: number;
    monthlyRevenue: number;
    oneTimePurchasesMonth: number;
    visitsToday: number;
    visits7d: number;
    gamesPublished: number;
    preSalePreSale: number;
    preSaleFunded: number;
    preSalePublished: number;
  };
  series: {
    revenue: { date: string; value: number }[];
    signups: { date: string; value: number }[];
    plays: { date: string; value: number }[];
  };
  topGames: { id: string; title: string; championship: string; slug: string; plays: number; estimatedRevenue: number }[];
  preSales: { id: string; title: string; status: string; fundedClubs: string; totalRaised: number; slug: string }[];
  alerts: { type: string; title: string; message: string; href: string | null }[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message || 'Erro ao carregar'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-netflix-light">Carregando dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-netflix-red">{error ?? 'Erro ao carregar'}</p>
      </div>
    );
  }

  const { kpis, series, topGames, preSales, alerts } = data;

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
      <p className="text-netflix-light text-sm mb-8">Visão geral operacional do portal</p>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
        <AdminKpiCard
          title="Usuários novos"
          value={`${kpis.usersToday} / ${kpis.users7d}`}
          subtitle="Hoje / 7 dias"
          icon="👥"
        />
        <AdminKpiCard
          title="Assinantes ativos"
          value={`${kpis.activeSubsMonthly + kpis.activeSubsAnnual}`}
          subtitle={`Mensal: ${kpis.activeSubsMonthly} • Anual: ${kpis.activeSubsAnnual}`}
          icon="📋"
        />
        <AdminKpiCard
          title="Receita do mês"
          value={formatCurrency(kpis.monthlyRevenue)}
          icon="💰"
        />
        <AdminKpiCard
          title="Compras unitárias (mês)"
          value={kpis.oneTimePurchasesMonth}
          icon="🛒"
        />
        <AdminKpiCard
          title="Acessos"
          value={`${kpis.visitsToday} / ${kpis.visits7d}`}
          subtitle="Hoje / 7 dias"
          icon="📊"
        />
        <AdminKpiCard title="Jogos publicados" value={kpis.gamesPublished} icon="▶" />
        <AdminKpiCard
          title="Pré-estreias"
          value={`PRE: ${kpis.preSalePreSale} • FUND: ${kpis.preSaleFunded} • PUB: ${kpis.preSalePublished}`}
          subtitle="Por status"
          icon="🎬"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <AdminLineChart
          data={series.revenue}
          title="Receita por dia (últimos 30 dias)"
          formatValue={(v) => formatCurrency(v)}
          color="#e50914"
        />
        <AdminLineChart
          data={series.signups}
          title="Cadastros por dia (últimos 30 dias)"
          color="#22c55e"
        />
        <AdminLineChart
          data={series.plays}
          title="Plays por dia (últimos 30 dias)"
          color="#3b82f6"
        />
      </div>

      {/* Tabelas e alertas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Top 10 jogos mais assistidos (30 dias)</h2>
          <AdminTable
            columns={[
              { key: 'title', header: 'Jogo', render: (r) => <Link href={`/jogo/${r.slug}`} className="text-netflix-red hover:underline truncate block max-w-[200px]">{r.title}</Link> },
              { key: 'championship', header: 'Campeonato' },
              { key: 'plays', header: 'Plays' },
              {
                key: 'estimatedRevenue',
                header: 'Receita est.',
                render: (r) => formatCurrency(r.estimatedRevenue),
              },
            ]}
            data={topGames}
            keyExtractor={(r) => r.id}
            emptyMessage="Sem dados de plays ainda"
          />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Pré-estreias em andamento</h2>
          <AdminTable
            columns={[
              { key: 'title', header: 'Título' },
              { key: 'status', header: 'Status' },
              { key: 'fundedClubs', header: 'Financiado' },
              { key: 'totalRaised', header: 'Total', render: (r) => formatCurrency(r.totalRaised) },
              {
                key: 'id',
                header: '',
                render: (r) => (
                  <div className="flex gap-2">
                    <Link href={`/admin/pre-estreia/${r.id}/editar`} className="px-2 py-1 rounded bg-netflix-gray text-white text-xs hover:bg-white/20">
                      Editar
                    </Link>
                    {r.status === 'FUNDED' && (
                      <Link href={`/admin/pre-estreia/${r.id}`} className="px-2 py-1 rounded bg-netflix-red/80 text-white text-xs hover:bg-netflix-red">
                        Publicar
                      </Link>
                    )}
                  </div>
                ),
              },
            ]}
            data={preSales}
            keyExtractor={(r) => r.id}
            emptyMessage="Nenhuma pré-estreia em andamento"
          />
        </div>
      </div>

      {/* Alertas */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Alertas operacionais</h2>
        <AdminAlerts alerts={alerts} />
      </div>
    </div>
  );
}
