'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    type: 'recorrente' as 'unitario' | 'recorrente',
    periodicity: 'mensal' as 'mensal' | 'anual' | 'personalizado',
    price: '',
    description: '',
    active: true,
    acessoTotal: true,
    duracaoDias: '' as string,
    renovacaoAuto: false,
    teamPayoutPercent: 0,
    partnerCommissionPercent: 0,
    maxConcurrentStreams: '' as string,
  });

  useEffect(() => {
    fetch(`/api/admin/plans/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setForm({
          name: data.name,
          type: data.type,
          periodicity: data.periodicity,
          price: String(data.price),
          description: data.description || '',
          active: data.active,
          acessoTotal: data.acessoTotal,
          duracaoDias: data.duracaoDias != null ? String(data.duracaoDias) : '',
          renovacaoAuto: data.renovacaoAuto,
          teamPayoutPercent: data.teamPayoutPercent ?? 0,
          partnerCommissionPercent: data.partnerCommissionPercent ?? 0,
          maxConcurrentStreams: data.maxConcurrentStreams != null ? String(data.maxConcurrentStreams) : '',
        });
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          periodicity: form.periodicity,
          price: Number(form.price) || 0,
          description: form.description || null,
          active: form.active,
          acessoTotal: form.acessoTotal,
          duracaoDias: form.duracaoDias === '' ? null : Number(form.duracaoDias),
          renovacaoAuto: form.renovacaoAuto,
          teamPayoutPercent: Number(form.teamPayoutPercent) ?? 0,
          partnerCommissionPercent: Number(form.partnerCommissionPercent) ?? 0,
          maxConcurrentStreams: form.maxConcurrentStreams === '' ? null : Number(form.maxConcurrentStreams),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao atualizar');
        return;
      }
      router.push('/admin/planos');
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-netflix-light">Carregando...</p>
      </div>
    );
  }

  if (error && !form.name) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-netflix-red mb-4">{error}</p>
        <Link href="/admin/planos" className="text-netflix-light hover:text-white">← Voltar aos planos</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/admin/planos" className="text-netflix-light hover:text-white text-sm">← Voltar aos planos</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Editar plano</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-netflix-dark border border-white/10 rounded-lg p-6">
        {error && (
          <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{error}</p>
        )}
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Nome do plano *</label>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Tipo</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'unitario' | 'recorrente' }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red">
              <option value="unitario">Unitário</option>
              <option value="recorrente">Recorrente</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Periodicidade</label>
            <select value={form.periodicity} onChange={(e) => setForm((f) => ({ ...f, periodicity: e.target.value as 'mensal' | 'anual' | 'personalizado' }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red">
              <option value="mensal">Mensal</option>
              <option value="anual">Anual</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Preço (R$) *</label>
          <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red" />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Descrição</label>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red resize-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Duração (dias)</label>
          <input type="number" min="0" value={form.duracaoDias} onChange={(e) => setForm((f) => ({ ...f, duracaoDias: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red" />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">% comissão para o time</label>
          <input
            type="number"
            min={0}
            max={100}
            value={form.teamPayoutPercent}
            onChange={(e) => setForm((f) => ({ ...f, teamPayoutPercent: Number(e.target.value) || 0 }))}
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
          <p className="text-xs text-netflix-light mt-1">Quando o usuário escolher um &quot;time de coração&quot; no checkout, este percentual vai para o time.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">% comissão para o parceiro</label>
          <input
            type="number"
            min={0}
            max={100}
            value={form.partnerCommissionPercent}
            onChange={(e) => setForm((f) => ({ ...f, partnerCommissionPercent: Number(e.target.value) ?? 0 }))}
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
          <p className="text-xs text-netflix-light mt-1">Quando alguém comprar por indicação de parceiro, este % será a comissão do parceiro (0 = usa o % do cadastro do parceiro).</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Telas simultâneas</label>
          <input
            type="number"
            min="1"
            value={form.maxConcurrentStreams}
            onChange={(e) => setForm((f) => ({ ...f, maxConcurrentStreams: e.target.value }))}
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
          <p className="text-xs text-netflix-light mt-1">
            Número máximo de dispositivos assistindo ao mesmo tempo com este plano. Vazio = usar limite padrão do sistema.
          </p>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="rounded border-white/30 text-netflix-red focus:ring-netflix-red" />
            <span className="text-sm text-netflix-light">Plano ativo</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.acessoTotal} onChange={(e) => setForm((f) => ({ ...f, acessoTotal: e.target.checked }))} className="rounded border-white/30 text-netflix-red focus:ring-netflix-red" />
            <span className="text-sm text-netflix-light">Acesso total</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.renovacaoAuto} onChange={(e) => setForm((f) => ({ ...f, renovacaoAuto: e.target.checked }))} className="rounded border-white/30 text-netflix-red focus:ring-netflix-red" />
            <span className="text-sm text-netflix-light">Renovação automática</span>
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <Link href="/admin/planos" className="px-6 py-3 rounded bg-netflix-gray text-white font-semibold hover:bg-white/20">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
