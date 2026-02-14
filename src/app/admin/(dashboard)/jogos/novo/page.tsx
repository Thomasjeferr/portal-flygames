'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from '@/lib/youtube';

export default function NewGamePage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({
    title: '',
    championship: '',
    gameDate: new Date().toISOString().slice(0, 16),
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    categoryId: '' as string,
    featured: false,
  });

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok && data.url) {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      setForm((f) => ({ ...f, thumbnailUrl: base + data.url }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          thumbnailUrl: form.thumbnailUrl || undefined,
          categoryId: form.categoryId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao cadastrar');
        return;
      }
      router.push('/admin/jogos');
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
        <Link href="/admin/jogos" className="text-netflix-light hover:text-white text-sm">
          ← Voltar aos jogos
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Cadastrar jogo</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-netflix-dark border border-white/10 rounded-lg p-6">
        {error && (
          <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {error}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Título *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            placeholder="Ex: Time A x Time B - Final"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Campeonato *</label>
          <input
            type="text"
            value={form.championship}
            onChange={(e) => setForm((f) => ({ ...f, championship: e.target.value }))}
            required
            placeholder="Ex: Liga Municipal, Copa da Várzea"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Categoria</label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          >
            <option value="">Nenhuma</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Data do jogo *</label>
          <input
            type="datetime-local"
            value={form.gameDate}
            onChange={(e) => setForm((f) => ({ ...f, gameDate: e.target.value }))}
            required
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Descrição</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Link do vídeo *</label>
          <input
            type="url"
            value={form.videoUrl}
            onChange={(e) => {
              const url = e.target.value;
              setForm((f) => {
                const next = { ...f, videoUrl: url };
                if (url) {
                  const vid = extractYouTubeVideoId(url);
                  if (vid && !f.thumbnailUrl) {
                    next.thumbnailUrl = getYouTubeThumbnailUrl(vid);
                  }
                }
                return next;
              });
            }}
            required
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
          <p className="text-xs text-netflix-light mt-1">
            Cole a URL do YouTube (ex: youtube.com/watch?v=... ou youtu.be/...), Vimeo ou PandaVideo. Se for YouTube, a thumbnail será preenchida automaticamente.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Thumbnail</label>
          <input type="file" ref={fileInput} accept="image/*" className="hidden" onChange={handleUpload} />
          <div className="flex gap-3 items-center flex-wrap">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="px-4 py-2 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
            >
              Upload imagem
            </button>
            <span className="text-xs text-netflix-light">ou</span>
            <input
              type="url"
              value={form.thumbnailUrl}
              onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
              placeholder="Cole a URL da imagem"
              className="flex-1 min-w-[200px] px-4 py-2 rounded bg-netflix-gray border border-white/20 text-white text-sm placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
          <p className="text-xs text-netflix-light mt-1">
            Imagem de capa exibida na vitrine. Recomendado: 16:9 (ex: 1280x720px).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="featured"
            checked={form.featured}
            onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
            className="rounded border-white/30 text-netflix-red focus:ring-netflix-red"
          />
          <label htmlFor="featured" className="text-sm text-netflix-light">
            Destacar na página inicial
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Cadastrar'}
          </button>
          <Link
            href="/admin/jogos"
            className="px-6 py-3 rounded bg-netflix-gray text-white font-semibold hover:bg-white/20"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
