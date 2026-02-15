'use client';

import { useEffect, useState } from 'react';
import { AnalyticsMap } from '@/components/admin/AnalyticsMap';

type AnalyticsData = {
  totalVisits: number;
  byCountry: { country: string; count: number }[];
  byCity: { city: string; country: string; count: number }[];
  byPage: { pagePath: string; count: number }[];
  markers: { id: string; lat: number; lng: number; country: string | null; city: string | null; pagePath: string; createdAt: string }[];
  dateRange: { from: string; to: string };
};

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/analytics?days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), [days]);

  if (loading && !data) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-10">
        <p className="text-netflix-light">Carregando analytics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics & Geolocalização</h1>
          <p className="text-netflix-light text-sm mt-1">
            De onde seus visitantes acessam. Use para direcionar campanhas.
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-4 py-2 rounded bg-netflix-dark border border-white/20 text-white"
        >
          <option value={1}>Últimas 24h</option>
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
          <option value={180}>Últimos 6 meses</option>
        </select>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-netflix-dark border border-white/10 rounded-lg p-6">
              <p className="text-netflix-light text-sm">Total de visitas</p>
              <p className="text-3xl font-bold text-white mt-1">{data.totalVisits}</p>
            </div>
            <div className="bg-netflix-dark border border-white/10 rounded-lg p-6">
              <p className="text-netflix-light text-sm">Países distintos</p>
              <p className="text-3xl font-bold text-white mt-1">{data.byCountry.length}</p>
            </div>
            <div className="bg-netflix-dark border border-white/10 rounded-lg p-6">
              <p className="text-netflix-light text-sm">Cidades distintas</p>
              <p className="text-3xl font-bold text-white mt-1">{data.byCity.length}</p>
            </div>
            <div className="bg-netflix-dark border border-white/10 rounded-lg p-6">
              <p className="text-netflix-light text-sm">Marcadores no mapa</p>
              <p className="text-3xl font-bold text-white mt-1">{data.markers.length}</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Mapa de visitantes</h2>
            <AnalyticsMap markers={data.markers} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-netflix-dark border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Top países</h3>
              <ul className="space-y-2">
                {data.byCountry.slice(0, 10).map((c, i) => (
                  <li key={c.country} className="flex justify-between text-sm">
                    <span className="text-netflix-light">{i + 1}. {c.country}</span>
                    <span className="text-white font-medium">{c.count}</span>
                  </li>
                ))}
                {data.byCountry.length === 0 && <li className="text-netflix-light text-sm">Nenhum dado</li>}
              </ul>
            </div>
            <div className="bg-netflix-dark border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Top cidades</h3>
              <ul className="space-y-2">
                {data.byCity.slice(0, 10).map((c, i) => (
                  <li key={`${c.city}-${c.country}`} className="flex justify-between text-sm">
                    <span className="text-netflix-light truncate mr-2">{i + 1}. {c.city}, {c.country}</span>
                    <span className="text-white font-medium shrink-0">{c.count}</span>
                  </li>
                ))}
                {data.byCity.length === 0 && <li className="text-netflix-light text-sm">Nenhum dado</li>}
              </ul>
            </div>
            <div className="bg-netflix-dark border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Páginas mais visitadas</h3>
              <ul className="space-y-2">
                {data.byPage.slice(0, 10).map((p, i) => (
                  <li key={p.pagePath} className="flex justify-between text-sm">
                    <span className="text-netflix-light truncate mr-2">{i + 1}. {p.pagePath || '/'}</span>
                    <span className="text-white font-medium shrink-0">{p.count}</span>
                  </li>
                ))}
                {data.byPage.length === 0 && <li className="text-netflix-light text-sm">Nenhum dado</li>}
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-netflix-dark/50 border border-white/10 rounded-lg">
            <p className="text-netflix-light text-sm">
              <strong>Período:</strong> {new Date(data.dateRange.from).toLocaleDateString('pt-BR')} até {new Date(data.dateRange.to).toLocaleDateString('pt-BR')}.
              Os dados são baseados em geolocalização por IP (ip-api.com).
            </p>
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="bg-netflix-dark border border-white/10 rounded-lg p-12 text-center">
          <p className="text-netflix-light">Nenhum dado de visitas no período.</p>
          <p className="text-netflix-light text-sm mt-2">O tracking registra visitas em páginas públicas (exclui /admin).</p>
        </div>
      )}
    </div>
  );
}
