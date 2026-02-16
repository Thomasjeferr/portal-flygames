'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

function formatPrice(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return s;
  }
}

type Earning = {
  id: string;
  source: 'sponsor' | 'plan';
  amountCents: number;
  status: string;
  paidAt: string | null;
  paymentReference: string | null;
  createdAt: string;
  description: string;
  subDescription: string;
  orderCreatedAt: string;
};

type Data = {
  team: { id: string; name: string; payoutPixKey: string | null; payoutName: string | null };
  summary: { pendingCents: number; paidCents: number };
  earnings: Earning[];
};

export default function AdminTimesComissoesPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/teams/${id}/earnings`)
      .then(async (r) => {
        const text = await r.text();
        let d: { error?: string; team?: unknown; summary?: unknown; earnings?: unknown };
        try {
          d = JSON.parse(text);
        } catch {
          setError(r.ok ? 'Erro ao carregar' : 'Erro no servidor. Tente de novo.');
          return;
        }
        if (d.error) setError(d.error);
        else if (d.team && d.summary && Array.isArray(d.earnings)) setData(d as Data);
        else setError('Resposta inválida');
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleMarkPaid = async (earningId: string, source: 'sponsor' | 'plan', ref?: string) => {
    setPayingId(earningId);
    try {
      const url = source === 'plan'
        ? `/api/admin/teams/${id}/plan-earnings/${earningId}/pay`
        : `/api/admin/teams/${id}/earnings/${earningId}/pay`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentReference: ref || null }),
      });
      if (res.ok) {
        const d = await fetch(`/api/admin/teams/${id}/earnings`).then((r) => r.json());
        if (!d.error) setData(d);
      }
    } finally {
      setPayingId(null);
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-10 text-netflix-light">Carregando...</div>;
  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-netflix-red">{error || 'Time não encontrado'}</p>
        <Link href="/admin/times" className="text-netflix-light hover:text-white mt-4 inline-block">
          ← Voltar aos times
        </Link>
      </div>
    );
  }

  const { team, summary, earnings } = data;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/admin/times" className="text-netflix-light hover:text-white text-sm">
          ← Voltar aos times
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Comissões</h1>
      <p className="text-netflix-light mb-6">{team.name}</p>

      {(team.payoutPixKey || team.payoutName) && (
        <div className="mb-6 p-4 rounded-lg bg-netflix-dark border border-white/10">
          <p className="text-netflix-light text-sm">
            {team.payoutName && <span>Favorecido: {team.payoutName}</span>}
            {team.payoutPixKey && (
              <span className={team.payoutName ? ' ml-4' : ''}>Chave PIX: {team.payoutPixKey}</span>
            )}
          </p>
          <p className="text-xs text-netflix-light mt-1">
            Configure em Editar time (campos de repasse) para facilitar os pagamentos.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 rounded-lg bg-netflix-dark border border-amber-500/30">
          <p className="text-netflix-light text-sm">Pendente de repasse</p>
          <p className="text-xl font-bold text-amber-400">{formatPrice(summary.pendingCents)}</p>
        </div>
        <div className="p-4 rounded-lg bg-netflix-dark border border-white/10">
          <p className="text-netflix-light text-sm">Já pago</p>
          <p className="text-xl font-bold text-white">{formatPrice(summary.paidCents)}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-white mb-4">Histórico de comissões</h2>

      {earnings.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-netflix-dark p-8 text-center">
          <p className="text-netflix-light">Nenhuma comissão para este time.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-netflix-dark">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-netflix-light text-sm">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {earnings.map((e) => (
                <tr key={e.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-netflix-light text-sm">
                    {formatDate(e.orderCreatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-netflix-light text-sm">
                      {e.source === 'sponsor' ? 'Patrocínio' : 'Plano/Jogo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white">
                    <span className="font-medium">{e.description}</span>
                    {e.subDescription && (
                      <span className="text-netflix-light text-sm block">{e.subDescription}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{formatPrice(e.amountCents)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        e.status === 'paid'
                          ? 'text-futvar-green'
                          : 'text-amber-400'
                      }
                    >
                      {e.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                    {e.status === 'paid' && e.paidAt && (
                      <span className="text-netflix-light text-sm block">
                        {formatDate(e.paidAt)}
                        {e.paymentReference && ` · ${e.paymentReference}`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {e.status === 'pending' && (
                      <button
                        onClick={() => {
                          const ref = window.prompt('Referência do pagamento (opcional):');
                          handleMarkPaid(e.id, e.source, ref ?? undefined);
                        }}
                        disabled={payingId === e.id}
                        className="px-3 py-1.5 rounded bg-futvar-green text-futvar-darker text-sm font-medium hover:bg-futvar-green-light disabled:opacity-50"
                      >
                        {payingId === e.id ? '...' : 'Marcar como pago'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6">
        <Link
          href={`/admin/times/${id}/editar`}
          className="text-netflix-light hover:text-white text-sm"
        >
          Editar time (dados para repasse)
        </Link>
      </div>
    </div>
  );
}
