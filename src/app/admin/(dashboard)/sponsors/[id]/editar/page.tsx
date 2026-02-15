'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';

const TIERS = [
  { value: 'MASTER', label: 'Master' },
  { value: 'OFICIAL', label: 'Oficial' },
  { value: 'APOIO', label: 'Apoio' },
];

function ensureFullUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return (typeof window !== 'undefined' ? window.location.origin : '') + url;
  return url;
}

export default function EditSponsorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const fileInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    website_url: '',
    logo_url: '',
    tier: 'APOIO',
    priority: 0,
    is_active: true,
    start_at: '',
    end_at: '',
  });

  useEffect(() => {
    fetch(`/api/admin/sponsors/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setForm({
          name: data.name || '',
          website_url: data.websiteUrl || '',
          logo_url: ensureFullUrl(data.logoUrl || ''),
          tier: data.tier || 'APOIO',
          priority: data.priority ?? 0,
          is_active: data.isActive ?? true,
          start_at: data.startAt ? new Date(data.startAt).toISOString().slice(0, 16) : '',
          end_at: data.endAt ? new Date(data.endAt).toISOString().slice(0, 16) : '',
        });
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      setError('Formato inválido. Use PNG, JPG, WebP ou SVG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 2MB.');
      return;
    }
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok && data.url) {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      setForm((f) => ({ ...f, logo_url: base + data.url }));
    } else {
      setError(data.error || 'Erro no upload');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const logoUrl = form.logo_url.startsWith('http') ? form.logo_url : form.logo_url.replace(/^\/\//, 'https://');
      const res = await fetch(`/api/admin/sponsors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          website_url: form.website_url.trim() || null,
          logo_url: form.logo_url.startsWith('/') ? form.logo_url : logoUrl,
          tier: form.tier,
          priority: Number(form.priority) || 0,
          is_active: form.is_active,
          start_at: form.start_at || null,
          end_at: form.end_at || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao atualizar');
        return;
      }
      router.push('/admin/sponsors');
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
        <p className="text-netflix-red">{error}</p>
        <Link href="/admin/sponsors" className="text-netflix-light hover:text-white mt-4 inline-block">
          Voltar aos patrocinadores
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/admin/sponsors" className="text-netflix-light hover:text-white text-sm mb-6 inline-block">
          ← Voltar aos patrocinadores
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Editar patrocinador</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-netflix-dark border border-white/10 rounded-lg p-6">
        {error && (
          <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {error}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Nome *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            placeholder="Ex: Empresa XYZ"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">URL do site</label>
          <input
            type="url"
            value={form.website_url}
            onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
            placeholder="https://exemplo.com"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Logo *</label>
          <div className="flex gap-3 items-start">
            <input
              type="text"
              value={form.logo_url}
              onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
              placeholder="URL ou faça upload"
              className="flex-1 px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white hover:bg-white/10"
            >
              Upload
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.svg"
              className="hidden"
              onChange={handleUpload}
            />
          </div>
          <p className="mt-1 text-xs text-netflix-light">PNG, JPG, WebP ou SVG. Máx. 2MB.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Tier</label>
            <select
              value={form.tier}
              onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            >
              {TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Prioridade</label>
            <input
              type="number"
              min={0}
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) || 0 }))}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="rounded border-white/20"
            />
            <span className="text-netflix-light">Ativo</span>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Início (opcional)</label>
            <input
              type="datetime-local"
              value={form.start_at}
              onChange={(e) => setForm((f) => ({ ...f, start_at: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Fim (opcional)</label>
            <input
              type="datetime-local"
              value={form.end_at}
              onChange={(e) => setForm((f) => ({ ...f, end_at: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <Link
            href="/admin/sponsors"
            className="px-6 py-3 rounded bg-netflix-gray text-white font-semibold hover:bg-white/20"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
