'use client';

import { useEffect, useState } from 'react';

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
    totalLiberadoCents: 0,
    totalPagoCents: 0,
    itens: [],
  };

  const handleSolicitarSaque = async () => {
    if (!resumo.totalLiberadoCents || requesting) return;
    setError('');
    setSuccess('');
    setRequesting(true);
    try {
      const res = await fetch('/api/partner/withdrawals', { method: 'POST' });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        setError(body?.error || 'Erro ao solicitar saque.');
        return;
      }
      setSuccess('Saque solicitado com sucesso. Pagamento em até 3 dias úteis.');
      // Recarrega resumo
      const r = await fetch('/api/partner/ganhos');
      const json = r.ok ? await r.json() : null;
      setData(json);
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
            onClick={handleSolicitarSaque}
            disabled={requesting || resumo.totalLiberadoCents === 0}
            className="inline-flex items-center justify-center rounded-md bg-futvar-green px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {requesting ? 'Solicitando...' : 'Solicitar saque'}
          </button>
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
    </div>
  );
}
