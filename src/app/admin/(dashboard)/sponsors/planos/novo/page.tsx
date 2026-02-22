'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const BILLING_OPTIONS = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
];

const DEFAULT_FEATURE_FLAGS = [
  { key: 'show_in_footer', label: 'Logo no footer' },
  { key: 'show_in_player', label: 'No player' },
  { key: 'show_in_home_banner', label: 'Banner na home' },
  { key: 'overlay_in_live', label: 'Overlay em lives' },
  { key: 'exclusive_category', label: 'Categoria exclusiva' },
];

export default function NewSponsorPlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    price: '',
    billingPeriod: 'monthly' as string,
    benefits: [''] as string[],
    featuresFlags: Object.fromEntries(DEFAULT_FEATURE_FLAGS.map((f) => [f.key, true])),
    teamPayoutPercent: 0,
    partnerCommissionPercent: 0,
    sortOrder: 0,
    isActive: true,
  });

  const addBenefit = () => setForm((f) => ({ ...f, benefits: [...f.benefits, ''] }));
  const removeBenefit = (i: number) =>
    setForm((f) => ({ ...f, benefits: f.benefits.filter((_, j) => j !== i) }));
  const setBenefit = (i: number, v: string) =>
    setForm((f) => ({ ...f, benefits: f.benefits.map((b, j) => (j === i ? v : b)) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const benefits = form.benefits.filter((b) => b.trim());
      const res = await fetch('/api/admin/sponsor-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          price: Number(form.price) || 0,
          billingPeriod: form.billingPeriod,
          benefits,
          featuresFlags: form.featuresFlags,
          teamPayoutPercent: Number(form.teamPayoutPercent) || 0,
          partnerCommissionPercent: Number(form.partnerCommissionPercent) ?? 0,
          sortOrder: Number(form.sortOrder) || 0,
          isActive: form.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar plano');
        return;
      }
      router.push('/admin/sponsors/planos');
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/admin/sponsors/planos" className="text-netflix-light hover:text-white text-sm">
          ← Voltar aos planos
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Novo plano de patrocínio</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-netflix-dark border border-white/10 rounded-lg p-6">
        {error && (
          <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{error}</p>
        )}
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Nome *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="Ex: Bronze, Prata, Ouro, Master"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Preço (R$) *</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              required
              placeholder="0.00"
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Período de cobrança</label>
            <select
              value={form.billingPeriod}
              onChange={(e) => setForm((f) => ({ ...f, billingPeriod: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            >
              {BILLING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
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
          <p className="mt-1 text-xs text-netflix-light">Quando o patrocinador escolher um time, este percentual do valor vai para o time (0 = não repassa).</p>
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
          <p className="mt-1 text-xs text-netflix-light">Quando alguém patrocinar por indicação de parceiro, este % será a comissão do parceiro (0 = usa o % do cadastro do parceiro).</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Ordem de exibição</label>
          <input
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
          <p className="mt-1 text-xs text-netflix-light">Menor valor aparece primeiro</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Benefícios</label>
          <div className="space-y-2">
            {form.benefits.map((b, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={b}
                  onChange={(e) => setBenefit(i, e.target.value)}
                  placeholder="Ex: Logo no footer"
                  className="flex-1 px-4 py-2 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
                />
                <button
                  type="button"
                  onClick={() => removeBenefit(i)}
                  className="px-3 py-2 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50"
                >
                  −
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addBenefit}
              className="px-3 py-2 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
            >
              + Adicionar benefício
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Flags de exibição</label>
          <div className="space-y-2">
            {DEFAULT_FEATURE_FLAGS.map((f) => (
              <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featuresFlags[f.key] ?? false}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      featuresFlags: { ...prev.featuresFlags, [f.key]: e.target.checked },
                    }))
                  }
                  className="rounded border-white/20"
                />
                <span className="text-netflix-light">{f.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-white/20"
            />
            <span className="text-netflix-light">Ativo</span>
          </label>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Criar plano'}
          </button>
          <Link
            href="/admin/sponsors/planos"
            className="px-6 py-3 rounded bg-netflix-gray text-white font-semibold hover:bg-white/20"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
