'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Item = {
  id: string;
  type: string;
  clientLabel: string;
  date: string;
  commissionCents: number;
  commissionPercent?: number;
  status: string;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export default function ParceiroIndicacoesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/partner/indicacoes')
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => setItems(data.items ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Indicações</h1>
        <p className="text-futvar-light mt-1">
          Pessoas que assinaram ou patrocinaram pelo seu link. Valores exibidos são apenas o que você tem a receber (sua comissão).
        </p>
      </div>

      {loading ? (
        <p className="text-futvar-light">Carregando...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl bg-futvar-dark border border-white/10 p-8 text-center text-futvar-light">
          Nenhuma indicação ainda. Compartilhe seu link em <Link href="/parceiro/link" className="text-futvar-green hover:underline">Meu link</Link>.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-futvar-dark">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-futvar-light">
                <th className="px-4 py-3">Cliente / Empresa</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">% aplicado</th>
                <th className="px-4 py-3 text-right">Sua comissão</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-white">{row.clientLabel}</td>
                  <td className="px-4 py-3 text-futvar-light">
                    {row.type === 'plano' ? 'Plano / Jogo' : 'Patrocínio'}
                  </td>
                  <td className="px-4 py-3 text-futvar-light">
                    {new Date(row.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-right text-futvar-light">
                    {typeof row.commissionPercent === 'number' ? `${row.commissionPercent}%` : '—'}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
