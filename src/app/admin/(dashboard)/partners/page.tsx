'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Partner = {
  id: string;
  name: string;
  companyName: string | null;
  type: string;
  status: string;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  refCode: string;
  planCommissionPercent: number;
  gameCommissionPercent: number;
  sponsorCommissionPercent: number;
  createdAt: string;
  totalIndicacoes: number;
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  blocked: 'Bloqueado',
};

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError('');
    fetch('/api/admin/partners')
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Erro ao carregar parceiros');
        }
        return res.json();
      })
      .then((data: Partner[]) => setPartners(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setSavingId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/partners/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar status');
      }
      load();
    } catch (e: any) {
      setError(e.message || 'Erro ao atualizar status');
    } finally {
      setSavingId(null);
    }
  };

  const deletePartner = async (p: Partner) => {
    if (!confirm(`Tem certeza que deseja excluir o parceiro "${p.name}" (${p.refCode})? O cadastro e o histórico de comissões serão removidos.`)) {
      return;
    }
    setSavingId(p.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/partners/${p.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir parceiro');
      }
      load();
    } catch (e: any) {
      setError(e.message || 'Erro ao excluir parceiro');
    } finally {
      setSavingId(null);
    }
  };

  const updateCommissions = async (p: Partner) => {
    setSavingId(p.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/partners/${p.id}/commissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planCommissionPercent: p.planCommissionPercent,
          gameCommissionPercent: p.gameCommissionPercent,
          sponsorCommissionPercent: p.sponsorCommissionPercent,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar comissões');
      }
      load();
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar comissões');
    } finally {
      setSavingId(null);
    }
  };

  const handleCommissionChange = (id: string, field: keyof Partner, value: string) => {
    const n = Number(value.replace(/\D/g, ''));
    if (Number.isNaN(n)) return;
    setPartners((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              [field]: Math.max(0, Math.min(100, n)),
            }
          : p
      )
    );
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Parceiros</h1>
          <p className="text-sm text-netflix-light mt-1">
            Aprove cadastros, defina porcentagens de comissão e acompanhe quem está indicando vendas.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-900/20 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-netflix-light text-sm">Carregando parceiros...</p>
      ) : partners.length === 0 ? (
        <p className="text-netflix-light text-sm">Nenhum parceiro cadastrado ainda.</p>
      ) : (
        <div className="overflow-x-auto border border-white/10 rounded-lg bg-black/20">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-white/5 text-left text-xs uppercase tracking-wider text-netflix-light">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Cidade/UF</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3 text-center">Indicações</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Comissões (%)</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr key={p.id} className="border-t border-white/5">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-white">{p.name}</div>
                    {p.companyName && (
                      <div className="text-xs text-netflix-light mt-0.5">{p.companyName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-netflix-light text-xs">{p.type}</td>
                  <td className="px-4 py-3 align-top text-netflix-light text-xs">
                    {p.whatsapp ? `+55 ${p.whatsapp}` : '-'}
                  </td>
                  <td className="px-4 py-3 align-top text-netflix-light text-xs">
                    {p.city || p.state ? `${p.city ?? ''}${p.city && p.state ? ' / ' : ''}${p.state ?? ''}` : '-'}
                  </td>
                  <td className="px-4 py-3 align-top text-xs font-mono text-futvar-green">{p.refCode}</td>
                  <td className="px-4 py-3 align-top text-center text-xs text-netflix-light">
                    {p.totalIndicacoes ?? 0}
                  </td>
                  <td className="px-4 py-3 align-top text-xs">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 ${
                        p.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                          : p.status === 'pending'
                          ? 'bg-yellow-500/10 text-yellow-200 border border-yellow-500/40'
                          : 'bg-red-500/10 text-red-200 border border-red-500/40'
                      }`}
                    >
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-netflix-light">
                    <div className="flex flex-col gap-1">
                      <label className="flex items-center gap-1">
                        <span className="w-16">Planos</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={p.planCommissionPercent}
                          onChange={(e) => handleCommissionChange(p.id, 'planCommissionPercent', e.target.value)}
                          className="w-16 rounded border border-white/10 bg-black/40 px-1 py-0.5 text-right text-xs text-white"
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="w-16">Jogos</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={p.gameCommissionPercent}
                          onChange={(e) => handleCommissionChange(p.id, 'gameCommissionPercent', e.target.value)}
                          className="w-16 rounded border border-white/10 bg-black/40 px-1 py-0.5 text-right text-xs text-white"
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <span className="w-16">Patroc.</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={p.sponsorCommissionPercent}
                          onChange={(e) => handleCommissionChange(p.id, 'sponsorCommissionPercent', e.target.value)}
                          className="w-16 rounded border border-white/10 bg-black/40 px-1 py-0.5 text-right text-xs text-white"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => updateCommissions(p)}
                        disabled={savingId === p.id}
                        className="mt-1 inline-flex items-center justify-center rounded-md bg-futvar-green text-futvar-darker text-[11px] font-semibold px-2 py-1 hover:bg-futvar-green-light disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {savingId === p.id ? 'Salvando...' : 'Salvar comissões'}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-right text-xs">
                    <div className="inline-flex flex-col gap-1">
                      <Link
                        href={`/admin/partners/${p.id}`}
                        className="px-3 py-1 rounded-md bg-netflix-gray text-white hover:bg-white/20 text-center"
                      >
                        Ver
                      </Link>
                      <button
                        type="button"
                        onClick={() => updateStatus(p.id, 'approved')}
                        disabled={savingId === p.id || p.status === 'approved'}
                        className="px-3 py-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(p.id, 'blocked')}
                        disabled={savingId === p.id || p.status === 'blocked'}
                        className="px-3 py-1 rounded-md bg-red-700 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Bloquear
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePartner(p)}
                        disabled={savingId === p.id}
                        className="px-3 py-1 rounded-md border border-red-500/60 bg-transparent text-red-300 hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Deletar
                      </button>
                    </div>
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

