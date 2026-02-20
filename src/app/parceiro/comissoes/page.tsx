'use client';

import { useEffect, useState } from 'react';

type Resumo = {
  totalPendenteCents: number;
  totalPagoCents: number;
  itens: {
    id: string;
    type: string;
    commissionCents: number;
    status: string;
    date: string;
    paidAt: string | null;
  }[];
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export default function ParceiroComissoesPage() {
  const [data, setData] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/partner/ganhos')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-futvar-light">Carregando...</p>;
  }

  const resumo = data ?? {
    totalPendenteCents: 0,
    totalPagoCents: 0,
    itens: [],
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Comissões</h1>
        <p className="text-futvar-light mt-1">
          Valores que você tem a receber (líquido). Não exibimos faturamento total da empresa.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <div className="rounded-xl bg-futvar-dark border border-amber-500/30 p-5">
          <p className="text-sm text-futvar-light">Pendente</p>
          <p className="text-2xl font-bold text-amber-300">{formatMoney(resumo.totalPendenteCents)}</p>
          <p className="text-xs text-futvar-light mt-1">A receber</p>
        </div>
        <div className="rounded-xl bg-futvar-dark border border-emerald-500/30 p-5">
          <p className="text-sm text-futvar-light">Já pago</p>
          <p className="text-2xl font-bold text-emerald-300">{formatMoney(resumo.totalPagoCents)}</p>
          <p className="text-xs text-futvar-light mt-1">Total recebido</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-white mb-3">Histórico (valor líquido)</h2>
      {resumo.itens.length === 0 ? (
        <div className="rounded-xl bg-futvar-dark border border-white/10 p-8 text-center text-futvar-light">
          Nenhum ganho registrado ainda.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-futvar-dark">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-futvar-light">
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Sua comissão</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pago em</th>
              </tr>
            </thead>
            <tbody>
              {resumo.itens.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-futvar-light">
                    {row.type === 'plano' ? 'Plano / Jogo' : 'Patrocínio'}
                  </td>
                  <td className="px-4 py-3 text-futvar-light">
                    {new Date(row.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-futvar-green">
                    {formatMoney(row.commissionCents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                        row.status === 'paid'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {row.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-futvar-light text-xs">
                    {row.paidAt ? new Date(row.paidAt).toLocaleDateString('pt-BR') : '—'}
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
