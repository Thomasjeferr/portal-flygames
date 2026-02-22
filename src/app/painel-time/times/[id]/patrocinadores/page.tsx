'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
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

export default function PainelTimePatrocinadoresPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/team-portal/teams/${id}/patrocinios`)
      .then(async (r) => {
        const d = await r.json();
        if (d.error) setError(d.error);
        else if (d.team && Array.isArray(d.items)) setData(d);
      })
      .catch(() => setError('Erro ao carregar.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-10 text-futvar-light">Carregando...</div>;
  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-red-400">{error || 'Time não encontrado'}</p>
        <Link href="/painel-time" className="text-futvar-light hover:text-white mt-4 inline-block">
          ← Voltar ao painel
        </Link>
      </div>
    );
  }

  const { team, summary, items } = data;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-white mb-2">Patrocinadores do time</h1>
      <p className="text-futvar-light mb-6">
        Empresas e torcedores que apoiam o time (patrocínio, jogo avulso ou assinatura).
      </p>

      <div className="flex flex-wrap gap-4 mb-6 text-sm">
        <span className="text-futvar-light">
          Empresas: <strong className="text-white">{summary.empresasCount}</strong>
        </span>
        <span className="text-white/30">·</span>
        <span className="text-futvar-light">
          Torcedores: <strong className="text-white">{summary.torcedoresCount}</strong>
        </span>
        {summary.pendingCents > 0 && (
          <>
            <span className="text-white/30">·</span>
            <span className="text-amber-400">
              Repasse pendente: <strong>{formatPrice(summary.pendingCents)}</strong>
            </span>
          </>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-futvar-dark p-8 text-center">
          <p className="text-futvar-light">Ainda não há patrocinadores registrados para este time.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-futvar-dark">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-futvar-light">
              <tr>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Patrocinador</th>
                <th className="px-4 py-3 font-medium">Plano / Produto</th>
                <th className="px-4 py-3 font-medium">Valor repassado</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((i) => (
                <tr key={i.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-futvar-light">{TIPO_LABEL[i.tipo] ?? i.tipo}</td>
                  <td className="px-4 py-3 text-white">{i.patrocinador}</td>
                  <td className="px-4 py-3 text-futvar-light">{i.planoProduto}</td>
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
