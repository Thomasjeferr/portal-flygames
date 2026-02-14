'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewCategoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', order: 0, active: true });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar');
        return;
      }
      router.push('/admin/categorias');
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
        <Link href="/admin/categorias" className="text-netflix-light hover:text-white text-sm">Voltar</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Nova categoria</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-netflix-dark border border-white/10 rounded-lg p-6">
        {error && <p className="text-netflix-red text-sm bg-red-500/10 rounded px-3 py-2">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Nome *</label>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Ex: Liga Municipal" className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red" />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Ordem</label>
          <input type="number" min={0} value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) || 0 }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="rounded border-white/30 text-netflix-red" />
          <span className="text-sm text-netflix-light">Ativa</span>
        </label>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="px-6 py-3 rounded bg-netflix-red text-white font-semibold disabled:opacity-50">{loading ? 'Salvando...' : 'Criar'}</button>
          <Link href="/admin/categorias" className="px-6 py-3 rounded bg-netflix-gray text-white font-semibold">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
