'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { slugify } from '@/lib/slug';

const REGISTRATION_MODES = [
  { value: 'FREE', label: 'Grátis' },
  { value: 'PAID', label: 'Pago' },
  { value: 'GOAL', label: 'Meta (apoiadores)' },
];
const STATUSES = [
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'PUBLISHED', label: 'Publicado' },
];

export default function NewTournamentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    slug: '',
    season: '',
    region: '',
    maxTeams: 16,
    registrationMode: 'FREE' as 'FREE' | 'PAID' | 'GOAL',
    registrationFeeAmount: '',
    goalRequiredSupporters: '',
    goalPricePerSupporter: '',
    goalStartAt: '',
    goalEndAt: '',
    lockConfirmationOnGoal: true,
    status: 'DRAFT',
  });

  const updateSlugFromName = useCallback(() => {
    if (form.name && !form.slug) setForm((f) => ({ ...f, slug: slugify(f.name) }));
  }, [form.name, form.slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        season: form.season || null,
        region: form.region || null,
        maxTeams: form.maxTeams,
        registrationMode: form.registrationMode,
        lockConfirmationOnGoal: form.lockConfirmationOnGoal,
        status: form.status,
      };
      if (form.registrationMode === 'PAID') {
        body.registrationFeeAmount = form.registrationFeeAmount ? Number(form.registrationFeeAmount) : 0;
      }
      if (form.registrationMode === 'GOAL') {
        body.goalRequiredSupporters = form.goalRequiredSupporters ? Number(form.goalRequiredSupporters) : null;
        body.goalPricePerSupporter = form.goalPricePerSupporter ? Number(form.goalPricePerSupporter) : null;
        body.goalStartAt = form.goalStartAt || null;
        body.goalEndAt = form.goalEndAt || null;
      }
      const res = await fetch('/api/admin/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar torneio');
        return;
      }
      router.push('/admin/torneios');
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/admin/torneios" className="text-netflix-light hover:text-white text-sm">Voltar</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Novo torneio (Copa Mata-Mata)</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-netflix-dark border border-white/10 rounded-lg p-6">
        {error && <p className="text-netflix-red text-sm bg-red-500/10 rounded px-3 py-2">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Nome *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            onBlur={updateSlugFromName}
            required
            placeholder="Ex: Copa Regional 2026"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Slug (URL) *</label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
            placeholder="copa-regional-2026"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Temporada</label>
            <input type="text" value={form.season} onChange={(e) => setForm((f) => ({ ...f, season: e.target.value }))} placeholder="2026" className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red" />
          </div>
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Região</label>
            <input type="text" value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} placeholder="Sul" className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Máximo de times (1–32) *</label>
          <input type="number" min={1} max={32} value={form.maxTeams} onChange={(e) => setForm((f) => ({ ...f, maxTeams: Math.min(32, Math.max(1, Number(e.target.value) || 8)) }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red" />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Tipo de inscrição *</label>
          <select value={form.registrationMode} onChange={(e) => setForm((f) => ({ ...f, registrationMode: e.target.value as 'FREE' | 'PAID' | 'GOAL' }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red">
            {REGISTRATION_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        {form.registrationMode === 'PAID' && (
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Valor da inscrição (R$) *</label>
            <input type="number" step="0.01" min={0} value={form.registrationFeeAmount} onChange={(e) => setForm((f) => ({ ...f, registrationFeeAmount: e.target.value }))} placeholder="0,00" className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red" />
          </div>
        )}
        {form.registrationMode === 'GOAL' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-netflix-light mb-2">Meta de apoiadores *</label>
                <input type="number" min={1} value={form.goalRequiredSupporters} onChange={(e) => setForm((f) => ({ ...f, goalRequiredSupporters: e.target.value }))} placeholder="100" className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red" />
              </div>
              <div>
                <label className="block text-sm font-medium text-netflix-light mb-2">Valor por apoiador (R$) *</label>
                <input type="number" step="0.01" min={0} value={form.goalPricePerSupporter} onChange={(e) => setForm((f) => ({ ...f, goalPricePerSupporter: e.target.value }))} placeholder="29,90" className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-netflix-light mb-2">Início da meta</label>
                <input type="datetime-local" value={form.goalStartAt} onChange={(e) => setForm((f) => ({ ...f, goalStartAt: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red" />
              </div>
              <div>
                <label className="block text-sm font-medium text-netflix-light mb-2">Fim da meta</label>
                <input type="datetime-local" value={form.goalEndAt} onChange={(e) => setForm((f) => ({ ...f, goalEndAt: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.lockConfirmationOnGoal} onChange={(e) => setForm((f) => ({ ...f, lockConfirmationOnGoal: e.target.checked }))} className="rounded border-white/30 text-netflix-red" />
              <span className="text-sm text-netflix-light">Travar confirmação ao atingir meta (não volta atrás se cancelamentos)</span>
            </label>
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Status</label>
          <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red">
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="px-6 py-3 rounded bg-netflix-red text-white font-semibold disabled:opacity-50">{loading ? 'Salvando...' : 'Criar torneio'}</button>
          <Link href="/admin/torneios" className="px-6 py-3 rounded bg-netflix-gray text-white font-semibold">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
