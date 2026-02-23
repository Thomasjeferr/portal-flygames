'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewPlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    type: 'recorrente' as 'unitario' | 'recorrente',
    periodicity: 'mensal' as 'mensal' | 'anual' | 'personalizado',
    price: '',
    description: '',
    active: true,
    acessoTotal: true,
    duracaoDias: '' as string | number,
    renovacaoAuto: false,
    teamPayoutPercent: 0,
    partnerCommissionPercent: 0,
    maxConcurrentStreams: '' as string | number,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          periodicity: form.periodicity,
          price: Number(form.price) || 0,
          description: form.description || undefined,
          active: form.active,
          acessoTotal: form.acessoTotal,
          duracaoDias: form.duracaoDias === '' ? null : Number(form.duracaoDias),
          renovacaoAuto: form.renovacaoAuto,
          teamPayoutPercent: Number(form.teamPayoutPercent) || 0,
          partnerCommissionPercent: Number(form.partnerCommissionPercent) ?? 0,
          maxConcurrentStreams: form.maxConcurrentStreams === '' ? null : Number(form.maxConcurrentStreams),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar plano');
        return;
      }
      router.push('/admin/planos');
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
        <Link href="/admin/planos" className="text-netflix-light hover:text-white text-sm">
          ← Voltar aos planos
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Novo plano</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-netflix-dark border border-white/10 rounded-lg p-6">
        {error && (
          <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {error}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Nome do plano *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="Ex: Mensal, Anual, Jogo avulso"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'unitario' | 'recorrente' }))}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            >
              <option value="unitario">Unitário (jogo avulso)</option>
              <option value="recorrente">Recorrente (assinatura)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Periodicidade</label>
            <select
              value={form.periodicity}
              onChange={(e) => setForm((f) => ({ ...f, periodicity: e.target.value as 'mensal' | 'anual' | 'personalizado' }))}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            >
              <option value="mensal">Mensal</option>
              <option value="anual">Anual</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Preço (R$) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            required
            placeholder="0,00"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Descrição</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Duração do acesso (dias)</label>
          <input
            type="number"
            min="0"
            value={form.duracaoDias}
            onChange={(e) => setForm((f) => ({ ...f, duracaoDias: e.target.value }))}
            placeholder="Vazio = ilimitado (unitário)"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
          <p className="text-xs text-netflix-light mt-1">Deixe vazio para acesso sem expiração (ex: jogo unitário).</p>
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
          <p className="text-xs text-netflix-light mt-1">Quando o usuário escolher um &quot;time de coração&quot; no checkout, este percentual do valor vai para o time.</p>
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
          <p className="text-xs text-netflix-light mt-1">Quando alguém comprar por indicação de um parceiro, este percentual será a comissão do parceiro (0 = usa o % do cadastro do parceiro).</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Telas simultâneas</label>
          <input
            type="number"
            min="1"
            value={form.maxConcurrentStreams}
            onChange={(e) => setForm((f) => ({ ...f, maxConcurrentStreams: e.target.value }))}
            placeholder="Ex: 1, 2, 4... (vazio = usar padrão do sistema)"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
          <p className="text-xs text-netflix-light mt-1">
            Número máximo de dispositivos assistindo ao mesmo tempo com este plano. Deixe vazio para usar o limite padrão.
          </p>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="rounded border-white/30 text-netflix-red focus:ring-netflix-red"
            />
            <span className="text-sm text-netflix-light">Plano ativo (exibir na página Planos para clientes)</span>
          </label>
          {form.type === 'unitario' && !form.active && (
            <p className="text-amber-300 text-sm w-full">Marque &quot;Plano ativo&quot; para que o jogo avulso apareça na página de planos.</p>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.acessoTotal}
              onChange={(e) => setForm((f) => ({ ...f, acessoTotal: e.target.checked }))}
              className="rounded border-white/30 text-netflix-red focus:ring-netflix-red"
            />
            <span className="text-sm text-netflix-light">Acesso total ao catálogo</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.renovacaoAuto}
              onChange={(e) => setForm((f) => ({ ...f, renovacaoAuto: e.target.checked }))}
              className="rounded border-white/30 text-netflix-red focus:ring-netflix-red"
            />
            <span className="text-sm text-netflix-light">Renovação automática</span>
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Criar plano'}
          </button>
          <Link href="/admin/planos" className="px-6 py-3 rounded bg-netflix-gray text-white font-semibold hover:bg-white/20">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
