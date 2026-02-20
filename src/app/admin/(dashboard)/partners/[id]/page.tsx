'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  blocked: 'Bloqueado',
};

const TYPE_LABEL: Record<string, string> = {
  revendedor: 'Revendedor',
  influencer: 'Influencer',
  lojista: 'Lojista',
  outro: 'Outro',
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

function formatDate(s: string | null) {
  if (!s) return '—';
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

type Partner = {
  id: string;
  name: string;
  companyName: string | null;
  type: string;
  status: string;
  refCode: string;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  document: string | null;
  planCommissionPercent: number;
  gameCommissionPercent: number;
  sponsorCommissionPercent: number;
  pixKey: string | null;
  pixKeyType: string | null;
  createdAt: string;
  updatedAt: string;
  userEmail: string | null;
  userName: string | null;
};

type Indicacao = {
  id: string;
  type: string;
  origemLabel: string;
  clientLabel: string;
  date: string;
  grossAmountCents: number;
  commissionPercent: number;
  commissionCents: number;
  status: string;
  paidAt: string | null;
  paymentReference: string | null;
};

type Data = {
  partner: Partner;
  stats: {
    totalIndicacoes: number;
    totalComissaoPendenteCents: number;
    totalComissaoPagoCents: number;
  };
  indicacoes: Indicacao[];
};

export default function AdminPartnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError('');
    fetch(`/api/admin/partners/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error || 'Erro ao carregar');
        }
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const updateStatus = async (status: string) => {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/partners/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Erro ao atualizar status');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const deletePartner = async () => {
    if (!data?.partner) return;
    if (!confirm(`Excluir o parceiro "${data.partner.name}" (${data.partner.refCode})? Cadastro e histórico de comissões serão removidos.`)) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/partners/${id}`, { method: 'DELETE' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Erro ao excluir');
      router.push('/admin/partners');
      return;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const updateCommissions = async () => {
    if (!data?.partner) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/partners/${id}/commissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planCommissionPercent: data.partner.planCommissionPercent,
          gameCommissionPercent: data.partner.gameCommissionPercent,
          sponsorCommissionPercent: data.partner.sponsorCommissionPercent,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Erro ao salvar comissões');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro');
    } finally {
      setSaving(false);
    }
  };

  const setCommission = (field: keyof Partner, value: number) => {
    if (!data) return;
    setData({
      ...data,
      partner: {
        ...data.partner,
        [field]: Math.max(0, Math.min(100, value)),
      },
    });
  };

  if (loading && !data) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-netflix-light">Carregando...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-netflix-red">{error}</p>
        <Link href="/admin/partners" className="text-netflix-light hover:text-white mt-4 inline-block">
          ← Voltar aos parceiros
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { partner, stats, indicacoes } = data;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/admin/partners" className="text-netflix-light hover:text-white text-sm">
          ← Voltar aos parceiros
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-900/20 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{partner.name}</h1>
          {partner.companyName && (
            <p className="text-netflix-light text-sm mt-0.5">{partner.companyName}</p>
          )}
          <p className="text-sm font-mono text-futvar-green mt-1">{partner.refCode}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateStatus('approved')}
            disabled={saving || partner.status === 'approved'}
            className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-sm hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Aprovar
          </button>
          <button
            type="button"
            onClick={() => updateStatus('blocked')}
            disabled={saving || partner.status === 'blocked'}
            className="px-3 py-1.5 rounded-md bg-red-700 text-white text-sm hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Bloquear
          </button>
          <button
            type="button"
            onClick={deletePartner}
            disabled={saving}
            className="px-3 py-1.5 rounded-md border border-red-500/60 bg-transparent text-red-300 text-sm hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Deletar
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <div className="rounded-lg border border-white/10 bg-black/20 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Dados cadastrais</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-netflix-light">Status</dt>
            <dd>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs ${
                  partner.status === 'approved'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                    : partner.status === 'pending'
                    ? 'bg-yellow-500/10 text-yellow-200 border border-yellow-500/40'
                    : 'bg-red-500/10 text-red-200 border border-red-500/40'
                }`}
              >
                {STATUS_LABEL[partner.status] ?? partner.status}
              </span>
            </dd>
            <dt className="text-netflix-light">Tipo</dt>
            <dd className="text-white">{TYPE_LABEL[partner.type] ?? partner.type}</dd>
            <dt className="text-netflix-light">WhatsApp</dt>
            <dd className="text-white">{partner.whatsapp ? `+55 ${partner.whatsapp}` : '—'}</dd>
            <dt className="text-netflix-light">Cidade / UF</dt>
            <dd className="text-white">
              {[partner.city, partner.state].filter(Boolean).join(' / ') || '—'}
            </dd>
            <dt className="text-netflix-light">CPF/CNPJ</dt>
            <dd className="text-white">{partner.document || '—'}</dd>
            <dt className="text-netflix-light">Conta vinculada</dt>
            <dd className="text-white">
              {partner.userEmail ? (
                <span title={partner.userName || undefined}>{partner.userEmail}</span>
              ) : (
                '—'
              )}
            </dd>
            <dt className="text-netflix-light">PIX</dt>
            <dd className="text-white">
              {partner.pixKey ? `${partner.pixKeyType || ''} ${partner.pixKey}`.trim() : '—'}
            </dd>
            <dt className="text-netflix-light">Cadastrado em</dt>
            <dd className="text-white">{formatDate(partner.createdAt)}</dd>
          </dl>

          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-netflix-light text-sm mb-2">Comissões (%)</p>
            <div className="flex flex-wrap gap-4 items-center">
              <label className="flex items-center gap-2">
                <span className="text-white text-sm w-20">Planos</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={partner.planCommissionPercent}
                  onChange={(e) =>
                    setCommission('planCommissionPercent', Number(e.target.value) || 0)
                  }
                  className="w-16 rounded border border-white/10 bg-black/40 px-2 py-1 text-sm text-white"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="text-white text-sm w-20">Jogos</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={partner.gameCommissionPercent}
                  onChange={(e) =>
                    setCommission('gameCommissionPercent', Number(e.target.value) || 0)
                  }
                  className="w-16 rounded border border-white/10 bg-black/40 px-2 py-1 text-sm text-white"
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="text-white text-sm w-16">Patroc.</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={partner.sponsorCommissionPercent}
                  onChange={(e) =>
                    setCommission('sponsorCommissionPercent', Number(e.target.value) || 0)
                  }
                  className="w-16 rounded border border-white/10 bg-black/40 px-2 py-1 text-sm text-white"
                />
              </label>
              <button
                type="button"
                onClick={updateCommissions}
                disabled={saving}
                className="px-3 py-1.5 rounded-md bg-futvar-green text-futvar-darker text-sm font-semibold hover:bg-futvar-green-light disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Salvar comissões'}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Resumo</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-netflix-light">Indicações (vendas)</span>
              <span className="text-xl font-bold text-white">{stats.totalIndicacoes}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <span className="text-netflix-light">Comissão pendente</span>
              <span className="text-xl font-bold text-amber-400">
                {formatMoney(stats.totalComissaoPendenteCents)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-netflix-light">Comissão paga</span>
              <span className="text-xl font-bold text-emerald-400">
                {formatMoney(stats.totalComissaoPagoCents)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-white mb-3">Indicações e comissões</h2>
      {indicacoes.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-black/20 p-8 text-center text-netflix-light">
          Nenhuma indicação ainda.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-black/20">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-netflix-light">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Cliente / Origem</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Valor bruto</th>
                <th className="px-4 py-3 text-right">%</th>
                <th className="px-4 py-3 text-right">Comissão parceiro</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pago em</th>
              </tr>
            </thead>
            <tbody>
              {indicacoes.map((row) => (
                <tr key={row.id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-netflix-light">{formatDate(row.date)}</td>
                  <td className="px-4 py-3">
                    <span className="text-white">{row.clientLabel}</span>
                    {row.origemLabel !== row.type && (
                      <span className="text-netflix-light text-xs block">{row.origemLabel}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-netflix-light">
                    {row.type === 'plano' ? 'Plano/Jogo' : 'Patrocínio'}
                  </td>
                  <td className="px-4 py-3 text-right text-white">
                    {formatMoney(row.grossAmountCents)}
                  </td>
                  <td className="px-4 py-3 text-right text-netflix-light">{row.commissionPercent}%</td>
                  <td className="px-4 py-3 text-right font-medium text-futvar-green">
                    {formatMoney(row.commissionCents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        row.status === 'paid'
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }
                    >
                      {row.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                    {row.paymentReference && (
                      <span className="text-netflix-light text-xs block">{row.paymentReference}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-netflix-light text-xs">
                    {formatDate(row.paidAt)}
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
