'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { WithdrawalPixModal, type WithdrawalPixPayload } from '@/components/withdrawal/WithdrawalPixModal';

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
  availableAt: string;
};

type Data = {
  team: { id: string; name: string; payoutPixKey: string | null; payoutName: string | null };
  summary: { pendingCents: number; availableCents: number; paidCents: number };
  earnings: Earning[];
};

export default function PainelTimeComissoesPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [success, setSuccess] = useState('');
  const [withdrawals, setWithdrawals] = useState<
    { id: string; amountCents: number; status: string; requestedAt: string; paidAt: string | null; receiptUrl: string | null }[]
  >([]);
  const [pixModalOpen, setPixModalOpen] = useState(false);

  const loadData = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const r = await fetch(`/api/team-portal/teams/${id}/earnings`);
      const text = await r.text();
      try {
        const d = JSON.parse(text);
        if (d.error) setError(d.error);
        else setData(d);
      } catch {
        setError('Erro ao carregar');
      }
    } catch {
      setError('Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    fetch(`/api/team-portal/teams/${id}/withdrawals`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (Array.isArray(json)) setWithdrawals(json);
      })
      .catch(() => {});
  }, [id]);

  const handleConfirmPix = async (payload: WithdrawalPixPayload) => {
    if (!data || requesting || data.summary.availableCents <= 0) return;
    setError('');
    setSuccess('');
    setRequesting(true);
    setPixModalOpen(false);
    try {
      const body = payload.useProfile ? {} : { pixKey: payload.pixKey, pixKeyType: payload.pixKeyType, pixName: payload.pixName };
      const res = await fetch(`/api/team-portal/teams/${id}/withdrawals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const resBody = await res.json().catch(() => null);
      if (!res.ok || !resBody?.ok) {
        setError(resBody?.error || 'Erro ao solicitar saque.');
        return;
      }
      setSuccess('Saque solicitado com sucesso. Pagamento em até 3 dias úteis.');
      await loadData();
      const wRes = await fetch(`/api/team-portal/teams/${id}/withdrawals`);
      if (wRes.ok) {
        const wJson = await wRes.json();
        if (Array.isArray(wJson)) setWithdrawals(wJson);
      }
    } catch {
      setError('Erro de conexão ao solicitar saque.');
    } finally {
      setRequesting(false);
    }
  };

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

  const { team, summary, earnings } = data;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/painel-time" className="text-futvar-light hover:text-white text-sm">
          ← Voltar ao painel
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">Comissões do time</h1>
      <p className="text-futvar-light mb-6">{team.name}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="p-4 rounded-lg bg-futvar-dark border border-amber-500/30">
          <p className="text-futvar-light text-sm">Pendente de repasse</p>
          <p className="text-xl font-bold text-amber-400">{formatPrice(summary.pendingCents)}</p>
        </div>
        <div className="p-4 rounded-lg bg-futvar-dark border border-sky-500/40">
          <p className="text-futvar-light text-sm">Liberado para saque</p>
          <p className="text-xl font-bold text-sky-300">{formatPrice(summary.availableCents)}</p>
        </div>
        <div className="p-4 rounded-lg bg-futvar-dark border border-white/10">
          <p className="text-futvar-light text-sm">Já pago</p>
          <p className="text-xl font-bold text-white">{formatPrice(summary.paidCents)}</p>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setPixModalOpen(true)}
            disabled={requesting || summary.availableCents <= 0}
            className="inline-flex items-center justify-center rounded-md bg-futvar-green px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {requesting ? 'Solicitando...' : 'Solicitar saque'}
          </button>
          <WithdrawalPixModal
            open={pixModalOpen}
            onClose={() => setPixModalOpen(false)}
            amountCents={summary.availableCents}
            existingPix={
              team.payoutPixKey
                ? { key: team.payoutPixKey, keyType: null, name: team.payoutName }
                : null
            }
            onSubmit={handleConfirmPix}
            submitting={requesting}
          />
          <p className="text-xs text-futvar-light">
            Após solicitar, o pagamento é realizado em até <span className="font-semibold">3 dias úteis</span>.
          </p>
        </div>
        <div className="space-y-1 text-sm">
          {error && <p className="text-red-400">{error}</p>}
          {success && <p className="text-futvar-green">{success}</p>}
        </div>
      </div>

      <h2 className="text-lg font-semibold text-white mb-4">Histórico de comissões</h2>

      {earnings.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-futvar-dark p-8 text-center">
          <p className="text-futvar-light">Ainda não há comissões para este time.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-futvar-dark">
          <table className="w-full text-left">
            <thead className="bg-white/5 text-futvar-light text-sm">
              <tr>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Descrição</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {earnings.map((e) => (
                <tr key={e.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-futvar-light text-sm">
                    {formatDate(e.orderCreatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-futvar-light text-sm">
                      {e.source === 'sponsor' ? 'Patrocínio' : 'Plano/Jogo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white">
                    <span className="font-medium">{e.description}</span>
                    {e.subDescription && (
                      <span className="text-futvar-light text-sm block">{e.subDescription}</span>
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
                      <span className="text-futvar-light text-sm block">
                        {formatDate(e.paidAt)}
                        {e.paymentReference && ` · ${e.paymentReference}`}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <h2 className="text-lg font-semibold text-white mt-10 mb-4">Histórico de saques</h2>
      {withdrawals.length === 0 ? (
        <p className="text-futvar-light text-sm">Nenhum saque solicitado ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-futvar-dark mt-2">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-futvar-light">
              <tr>
                <th className="px-4 py-3 font-medium">Solicitado em</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Pago em</th>
                <th className="px-4 py-3 font-medium">Recibo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {withdrawals.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-3 text-futvar-light">
                    {formatDate(w.requestedAt)}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">
                    {formatPrice(w.amountCents)}
                  </td>
                  <td className="px-4 py-3 text-futvar-light">
                    {w.status === 'paid'
                      ? 'Pago'
                      : w.status === 'processing'
                      ? 'Em processamento'
                      : w.status === 'canceled'
                      ? 'Cancelado'
                      : 'Solicitado'}
                  </td>
                  <td className="px-4 py-3 text-futvar-light text-sm">
                    {w.paidAt ? formatDate(w.paidAt) : '—'}
                  </td>
                  <td className="px-4 py-3 text-futvar-light text-xs">
                    {w.receiptUrl ? (
                      <a
                        href={w.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-futvar-green hover:underline"
                      >
                        Ver recibo
                      </a>
                    ) : (
                      '—'
                    )}
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

