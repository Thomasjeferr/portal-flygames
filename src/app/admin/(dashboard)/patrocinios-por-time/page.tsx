'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Summary = {
  empresasTotal: number;
  torcedoresTotal: number;
  valorTotalRepassadoCents: number;
};

type TeamStat = {
  teamId: string;
  teamName: string;
  empresasCount: number;
  torcedoresCount: number;
  valorTotalCents: number;
};

type Data = {
  summary: Summary;
  teams: TeamStat[];
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export default function AdminPatrociniosPorTimePage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch('/api/admin/patrocinios-por-time')
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          router.replace('/admin/entrar');
          return;
        }
        const d = await r.json();
        if (d.error) setError(d.error);
        else if (d.summary && Array.isArray(d.teams)) setData(d);
      })
      .catch(() => setError('Erro ao carregar.'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div className="max-w-5xl mx-auto px-6 py-10 text-netflix-light">Carregando...</div>;
  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <p className="text-netflix-red">{error || 'Erro ao carregar dados.'}</p>
        <Link href="/admin" className="text-netflix-light hover:text-white mt-4 inline-block">← Voltar</Link>
      </div>
    );
  }

  const { summary, teams } = data;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Patrocínios por time</h1>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-lg bg-netflix-dark border border-white/10">
          <p className="text-netflix-light text-sm">Empresas</p>
          <p className="text-xl font-bold text-white">{summary.empresasTotal}</p>
        </div>
        <div className="p-4 rounded-lg bg-netflix-dark border border-white/10">
          <p className="text-netflix-light text-sm">Torcedores</p>
          <p className="text-xl font-bold text-white">{summary.torcedoresTotal}</p>
        </div>
        <div className="p-4 rounded-lg bg-netflix-dark border border-amber-500/30 sm:col-span-2">
          <p className="text-netflix-light text-sm">Valor total repassado</p>
          <p className="text-xl font-bold text-amber-400">{formatPrice(summary.valorTotalRepassadoCents)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-netflix-dark">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-netflix-light">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Time</th>
              <th className="px-4 py-3 text-left font-medium">Empresas</th>
              <th className="px-4 py-3 text-left font-medium">Torcedores</th>
              <th className="px-4 py-3 text-left font-medium">Valor total</th>
              <th className="px-4 py-3 text-right font-medium">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {teams.map((t) => (
              <tr key={t.teamId} className="hover:bg-white/5">
                <td className="px-4 py-3 text-white font-medium">{t.teamName}</td>
                <td className="px-4 py-3 text-netflix-light">{t.empresasCount}</td>
                <td className="px-4 py-3 text-netflix-light">{t.torcedoresCount}</td>
                <td className="px-4 py-3 text-white">{formatPrice(t.valorTotalCents)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/patrocinios-por-time/${t.teamId}`}
                    className="px-3 py-1.5 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
                  >
                    Ver detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
