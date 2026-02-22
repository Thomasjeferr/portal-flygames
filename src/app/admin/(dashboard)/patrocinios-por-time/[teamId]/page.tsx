'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Item = {
  id: string;
  tipo: 'empresa' | 'torcedor_jogo_avulso' | 'torcedor_assinatura';
  patrocinador: string;
  planoProduto: string;
  valorRepassadoCents: number;
  status: string;
};

type Data = {
  team: { id: string; name: string };
  summary: { empresasCount: number; torcedoresCount: number; pendingCents: number };
  items: Item[];
};

const TIPO_LABEL: Record<string, string> = {
  empresa: 'Empresa',
  torcedor_jogo_avulso: 'Torcedor – Jogo avulso',
  torcedor_assinatura: 'Torcedor – Assinatura',
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export default function AdminPatrociniosPorTimeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.teamId as string;
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/admin/patrocinios-por-time/${teamId}`)
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          router.replace('/admin/entrar');
          return;
        }
        const d = await r.json();
        if (d.error) setError(d.error);
        else if (d.team && Array.isArray(d.items)) setData(d);
      })
      .catch(() => setError('Erro ao carregar.'))
      .finally(() => setLoading(false));
  }, [teamId, router]);

  if (loading) return <div className="max-w-5xl mx-auto px-6 py-10 text-netflix-light">Carregando...</div>;
  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-10">
        <p className="text-netflix-red">{error || 'Time não encontrado.'}</p>
        <Link href="/admin/patrocinios-por-time" className="text-netflix-light hover:text-white mt-4 inline-block">
          ← Voltar aos patrocínios por time
        </Link>
      </div>
    );
  }

  const { team, summary, items } = data;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link href="/admin/patrocinios-por-time" className="text-netflix-light hover:text-white text-sm">
          ← Patrocínios por time
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Detalhe do time: {team.name}</h1>
      <p className="text-netflix-light text-sm mb-6">
        Empresas: {summary.empresasCount} · Torcedores: {summary.torcedoresCount}
        {summary.pendingCents > 0 && (
          <> · Repasse pendente: {formatPrice(summary.pendingCents)}</>
        )}
      </p>

      {items.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-netflix-dark p-8 text-center">
          <p className="text-netflix-light">Nenhum patrocínio registrado para este time.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-netflix-dark">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-netflix-light">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-left font-medium">Patrocinador</th>
                <th className="px-4 py-3 text-left font-medium">Plano / Produto</th>
                <th className="px-4 py-3 text-left font-medium">Valor repassado</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((i) => (
                <tr key={i.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-netflix-light">{TIPO_LABEL[i.tipo] ?? i.tipo}</td>
                  <td className="px-4 py-3 text-white">{i.patrocinador}</td>
                  <td className="px-4 py-3 text-netflix-light">{i.planoProduto}</td>
                  <td className="px-4 py-3 text-white">{formatPrice(i.valorRepassadoCents)}</td>
                  <td className="px-4 py-3">
                    <span className={i.status === 'paid' ? 'text-futvar-green' : 'text-amber-400'}>
                      {i.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
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
