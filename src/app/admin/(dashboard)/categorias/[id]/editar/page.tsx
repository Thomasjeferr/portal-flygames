'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function EditCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', order: 0, active: true });

  useEffect(() => {
    fetch(`/api/admin/categories/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setForm({
          name: data.name,
          order: data.order ?? 0,
          active: data.active ?? true,
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
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao atualizar');
        return;
      }
      router.push('/admin/categorias');
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-2xl"><p className="text-netflix-light">Carregando...</p></div>;
  if (error && !form.name) return <div className="max-w-2xl"><p className="text-netflix-red mb-4">{error}</p><Link href="/admin/categorias" className="text-netflix-light hover:text-white">← Voltar</Link></div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-8"><Link href="/admin/categorias" className="text-netflix-light hover:text-white text-sm">← Voltar às categorias</Link></div>
      <h1 className="text-2xl font-bold text-white mb-6">Editar categoria</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-netflix-dark border border-white/10 rounded-lg p-6">
        {error && <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Nome *</label>
          <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red" />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Ordem</label>
          <input type="number" min={0} value={form.order} onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) || 0 }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} className="rounded border-white/30 text-netflix-red focus:ring-netflix-red" />
          <span className="text-sm text-netflix-light">Ativa</span>
        </label>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
          <Link href="/admin/categorias" className="px-6 py-3 rounded bg-netflix-gray text-white font-semibold hover:bg-white/20">Cancelar</Link>
        </div>
      </form>
    </div>
  );
}
