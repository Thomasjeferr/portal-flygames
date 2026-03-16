'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DashboardMetricCard } from '@/components/admin/DashboardMetricCard';
import { DashboardAreaChart } from '@/components/admin/DashboardAreaChart';
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

type SummaryCounts = {
  teamsTotal: number | null;
  tournamentsTotal: number | null;
  sponsorsTotal: number | null;
};

function computeGrowth(series: { value: number }[]): string | null {
  if (series.length < 30) return null;
  const firstHalf = series.slice(0, 15).reduce((s, d) => s + d.value, 0);
  const secondHalf = series.slice(15, 30).reduce((s, d) => s + d.value, 0);
  if (firstHalf === 0) return secondHalf > 0 ? '↑ +100% vs período anterior' : null;
  const pct = Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
  if (pct === 0) return null;
  return pct > 0 ? `↑ +${pct}% vs período anterior` : `↓ ${pct}% vs período anterior`;
}

function MetricIcon({ path, className = 'w-6 h-6' }: { path: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const icons = {
  users: () => <MetricIcon path="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-3.76m0-3.647v-3.647m0 0h3.75m-3.75 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />,
  subscription: () => <MetricIcon path="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />,
  revenue: () => <MetricIcon path="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75m15 0v.75c0 .414-.336.75-.75.75h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />,
  cart: () => <MetricIcon path="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.23-4.684 2.504-7.138a60.39 60.39 0 00-5.293-4.203 60.39 60.39 0 00-5.293 4.203 59.42 59.42 0 002.504 7.138m-12.75 3h11.218c1.121-2.3 2.23-4.684 2.504-7.138M12 13.5a3 3 0 01-3-3V6.75m0 0h12m-12 0V9.75M3 13.5a3 3 0 003 3m0-9.75h12" />,
  chart: () => <MetricIcon path="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />,
  play: () => <MetricIcon path="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />,
  film: () => <MetricIcon path="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h15a3 3 0 003-3v-9a3 3 0 00-3-3h-15zm9 9V9l3 2.25-3 2.25zm-9 2.25h.008v.008H4.5v-.008zm10.5 0h.008v.008h-.008v-.008z" />,
  team: () => <MetricIcon path="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />,
  trophy: () => <MetricIcon path="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />,
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [summary, setSummary] = useState<SummaryCounts>({ teamsTotal: null, tournamentsTotal: null, sponsorsTotal: null });
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

  useEffect(() => {
    if (!data) return;
    Promise.all([
      fetch('/api/admin/teams?page=1&limit=1').then((r) => r.json()).then((d) => d.total ?? null).catch(() => null),
      fetch('/api/admin/tournaments?page=1&limit=1').then((r) => r.json()).then((d) => d.total ?? null).catch(() => null),
      fetch('/api/admin/sponsors').then((r) => r.json()).then((arr) => Array.isArray(arr) ? arr.length : null).catch(() => null),
    ]).then(([teamsTotal, tournamentsTotal, sponsorsTotal]) => {
      setSummary({ teamsTotal, tournamentsTotal, sponsorsTotal });
    });
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-gray-400">Carregando dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
        <p className="text-red-400">{error ?? 'Erro ao carregar'}</p>
      </div>
    );
  }

  const { kpis, series, topGames, preSales, alerts } = data;
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const dateLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const revenueGrowth = computeGrowth(series.revenue);
  const signupsGrowth = computeGrowth(series.signups);

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="mt-1 text-gray-400">Visão geral operacional da plataforma</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-500 capitalize">{dateLabel}</span>
          <Link
            href="/admin/jogos/novo"
            className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-[#111827] px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#1F2937] hover:border-white/30"
          >
            Criar Jogo
          </Link>
          <Link
            href="/admin/lives/novo"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-500"
          >
            Nova Live
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <DashboardMetricCard
          title="Usuários novos"
          value={`${kpis.usersToday} / ${kpis.users7d}`}
          subtitle="Hoje / 7 dias"
          icon={icons.users()}
          accentColor="blue"
          growth={signupsGrowth}
        />
        <DashboardMetricCard
          title="Assinantes ativos"
          value={kpis.activeSubsMonthly + kpis.activeSubsAnnual}
          subtitle={`Mensal: ${kpis.activeSubsMonthly} • Anual: ${kpis.activeSubsAnnual}`}
          icon={icons.subscription()}
          accentColor="emerald"
        />
        <Link href="/admin/vendas" className="block transition-opacity hover:opacity-90">
          <DashboardMetricCard
            title="Receita do mês"
            value={formatCurrency(kpis.monthlyRevenue)}
            icon={icons.revenue()}
            accentColor="emerald"
            growth={revenueGrowth}
          />
        </Link>
        <DashboardMetricCard
          title="Compras unitárias (mês)"
          value={kpis.oneTimePurchasesMonth}
          icon={icons.cart()}
          accentColor="amber"
        />
        <DashboardMetricCard
          title="Acessos"
          value={`${kpis.visitsToday} / ${kpis.visits7d}`}
          subtitle="Hoje / 7 dias"
          icon={icons.chart()}
          accentColor="blue"
        />
        <DashboardMetricCard
          title="Jogos publicados"
          value={kpis.gamesPublished}
          icon={icons.play()}
          accentColor="gray"
        />
        <DashboardMetricCard
          title="Pré-estreias"
          value={`PRE: ${kpis.preSalePreSale} • FUND: ${kpis.preSaleFunded} • PUB: ${kpis.preSalePublished}`}
          subtitle="Por status"
          icon={icons.film()}
          accentColor="rose"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardAreaChart
          chartId="revenue"
          data={series.revenue}
          title="Receita por dia (últimos 30 dias)"
          formatValue={(v) => formatCurrency(v)}
          color="#10b981"
        />
        <DashboardAreaChart
          chartId="signups"
          data={series.signups}
          title="Cadastros por dia (últimos 30 dias)"
          color="#3b82f6"
        />
        <DashboardAreaChart
          chartId="plays"
          data={series.plays}
          title="Plays por dia (últimos 30 dias)"
          color="#8b5cf6"
        />
      </div>

      {/* Resumo da Plataforma */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">Resumo da plataforma</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardMetricCard
            title="Times cadastrados"
            value={summary.teamsTotal ?? '—'}
            icon={icons.team()}
            accentColor="blue"
          />
          <DashboardMetricCard
            title="Campeonatos"
            value={summary.tournamentsTotal ?? '—'}
            icon={icons.trophy()}
            accentColor="amber"
          />
          <DashboardMetricCard
            title="Jogos transmitidos"
            value={kpis.gamesPublished}
            icon={icons.play()}
            accentColor="emerald"
          />
          <DashboardMetricCard
            title="Patrocinadores"
            value={summary.sponsorsTotal ?? '—'}
            icon={icons.trophy()}
            accentColor="rose"
          />
        </div>
      </div>

      {/* Top Jogos + Pré-estreias */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-6">Top 10 jogos mais assistidos (30 dias)</h2>
          <div className="overflow-hidden rounded-xl border border-white/5">
            <AdminTable
              columns={[
                {
                  key: 'title',
                  header: 'Jogo',
                  render: (r) => (
                    <Link href={`/jogo/${r.slug}`} className="text-emerald-400 hover:underline truncate block max-w-[220px] font-medium">
                      {r.title}
                    </Link>
                  ),
                },
                { key: 'championship', header: 'Campeonato' },
                { key: 'plays', header: 'Plays' },
                {
                  key: 'estimatedRevenue',
                  header: 'Receita est.',
                  render: (r) => <span className="text-gray-300">{formatCurrency(r.estimatedRevenue)}</span>,
                },
              ]}
              data={topGames}
              keyExtractor={(r) => r.id}
              emptyMessage="Sem dados de plays ainda"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111827] p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-6">Pré-estreias em andamento</h2>
          {preSales.length === 0 ? (
            <p className="text-gray-500 text-sm py-8 text-center">Nenhuma pré-estreia em andamento</p>
          ) : (
            <div className="space-y-4">
              {preSales.map((ps) => {
                const [funded, total] = ps.fundedClubs.split('/').map((n) => parseInt(n.trim(), 10) || 0);
                const pct = total > 0 ? Math.round((funded / total) * 100) : 0;
                return (
                  <div
                    key={ps.id}
                    className="rounded-xl border border-white/10 bg-[#0B1120]/50 p-4 transition-colors duration-200 hover:border-white/20"
                  >
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <span className="font-medium text-white truncate">{ps.title}</span>
                      <span className="text-xs text-gray-500 shrink-0">{ps.status}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-400 shrink-0">{pct}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Financiado: {ps.fundedClubs} • {formatCurrency(ps.totalRaised)}</p>
                    <div className="flex gap-2 mt-3">
                      <Link
                        href={`/admin/pre-estreia/${ps.id}/editar`}
                        className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/10 transition-colors duration-200"
                      >
                        Editar
                      </Link>
                      {ps.status === 'FUNDED' && (
                        <Link
                          href={`/admin/pre-estreia/${ps.id}`}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 transition-colors duration-200"
                        >
                          Publicar
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
