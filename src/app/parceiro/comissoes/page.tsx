'use client';

import { useEffect, useState } from 'react';
import { WithdrawalPixModal, type WithdrawalPixPayload } from '@/components/withdrawal/WithdrawalPixModal';

type Resumo = {
  totalPendenteCents: number;
  totalLiberadoCents: number;
  totalPagoCents: number;
  itens: {
    id: string;
    type: string;
    commissionCents: number;
    commissionPercent?: number;
    status: string;
    date: string;
    paidAt: string | null;
    availableAt: string;
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
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [withdrawals, setWithdrawals] = useState<
    { id: string; amountCents: number; status: string; requestedAt: string; paidAt: string | null; receiptUrl: string | null }[]
  >([]);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState<{ pixKey: string | null; pixKeyType: string | null; name: string | null } | null>(null);

  useEffect(() => {
    fetch('/api/partner/ganhos')
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
    fetch('/api/partner/withdrawals')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (Array.isArray(json)) setWithdrawals(json);
      })
      .catch(() => {});
    fetch('/api/partner/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json && typeof json === 'object') {
          setPartnerProfile({
            pixKey: json.pixKey ?? null,
            pixKeyType: json.pixKeyType ?? null,
            name: json.name ?? null,
          });
        }
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return <p className="text-futvar-light">Carregando...</p>;
  }

  const resumo = data ?? {
    totalPendenteCents: 0,
    totalLiberadoCents: 0,
    totalPagoCents: 0,
    itens: [],
  };

  const handleConfirmPix = async (payload: WithdrawalPixPayload) => {
    if (!resumo.totalLiberadoCents || requesting) return;
    setError('');
    setSuccess('');
    setRequesting(true);
    setPixModalOpen(false);
    try {
      const body = payload.useProfile ? {} : { pixKey: payload.pixKey, pixKeyType: payload.pixKeyType, pixName: payload.pixName };
      const res = await fetch('/api/partner/withdrawals', {
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
      const r = await fetch('/api/partner/ganhos');
      const json = r.ok ? await r.json() : null;
      setData(json);
      const wRes = await fetch('/api/partner/withdrawals');
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Comissões</h1>
        <p className="text-futvar-light mt-1">
          Valores que você tem a receber (líquido). Não exibimos faturamento total da empresa.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-4">
        <div className="rounded-xl bg-futvar-dark border border-amber-500/30 p-5">
          <p className="text-sm text-futvar-light">Pendente</p>
          <p className="text-2xl font-bold text-amber-300">{formatMoney(resumo.totalPendenteCents)}</p>
          <p className="text-xs text-futvar-light mt-1">A receber</p>
        </div>
        <div className="rounded-xl bg-futvar-dark border border-sky-500/40 p-5">
          <p className="text-sm text-futvar-light">Liberado para saque</p>
          <p className="text-2xl font-bold text-sky-300">{formatMoney(resumo.totalLiberadoCents)}</p>
          <p className="text-xs text-futvar-light mt-1">Valor já disponível para solicitar saque.</p>
        </div>
        <div className="rounded-xl bg-futvar-dark border border-emerald-500/30 p-5">
          <p className="text-sm text-futvar-light">Já pago</p>
          <p className="text-2xl font-bold text-emerald-300">{formatMoney(resumo.totalPagoCents)}</p>
          <p className="text-xs text-futvar-light mt-1">Total recebido</p>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => setPixModalOpen(true)}
            disabled={requesting || resumo.totalLiberadoCents === 0}
            className="inline-flex items-center justify-center rounded-md bg-futvar-green px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {requesting ? 'Solicitando...' : 'Solicitar saque'}
          </button>
          <WithdrawalPixModal
            open={pixModalOpen}
            onClose={() => setPixModalOpen(false)}
            amountCents={resumo.totalLiberadoCents}
            existingPix={
              partnerProfile?.pixKey
                ? { key: partnerProfile.pixKey, keyType: partnerProfile.pixKeyType, name: partnerProfile.name }
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
                <th className="px-4 py-3 text-right">% aplicado</th>
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
                  <td className="px-4 py-3 text-futvar-light text-xs">
                    {row.paidAt ? new Date(row.paidAt).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="text-lg font-semibold text-white mt-10 mb-3">Histórico de saques</h2>
      {withdrawals.length === 0 ? (
        <p className="text-futvar-light text-sm">Nenhum saque solicitado ainda.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-futvar-dark mt-2">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-futvar-light">
                <th className="px-4 py-3">Solicitado em</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pago em</th>
                <th className="px-4 py-3">Recibo</th>
              </tr>
            </thead>
            <tbody>
              {withdrawals.map((w) => (
                <tr key={w.id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-futvar-light">
                    {new Date(w.requestedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-futvar-green font-medium">
                    {formatMoney(w.amountCents)}
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
                  <td className="px-4 py-3 text-futvar-light text-xs">
                    {w.paidAt ? new Date(w.paidAt).toLocaleDateString('pt-BR') : '—'}
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
