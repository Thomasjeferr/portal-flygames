'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { StreamVideoField } from '@/components/admin/StreamVideoField';

interface PreSaleCategory {
  id: string;
  name: string;
  type: string;
}

interface GradeCategory {
  id: string;
  name: string;
  slug: string;
  order: number;
}

interface Game {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string | null;
  specialCategoryId: string;
  gradeCategoryId: string | null;
  clubAPrice: number;
  clubBPrice: number;
  maxSimultaneousPerClub: number;
  featured: boolean;
  clubSlots: { paymentStatus: string }[];
  normalCategories: { categoryId: string }[];
}

export default function AdminPreEstreiaEditarPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [specialCategories, setSpecialCategories] = useState<PreSaleCategory[]>([]);
  const [normalCategories, setNormalCategories] = useState<PreSaleCategory[]>([]);
  const [gradeCategories, setGradeCategories] = useState<GradeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    thumbnailUrl: '',
    videoUrl: '',
    specialCategoryId: '',
    normalCategoryIds: [] as string[],
    gradeCategoryId: '',
    clubAPrice: '',
    clubBPrice: '',
    maxSimultaneousPerClub: '10',
    featured: false,
  });

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/admin/pre-sale-games/${id}`),
      fetch('/api/admin/pre-sale-categories?type=SPECIAL'),
      fetch('/api/admin/pre-sale-categories?type=NORMAL'),
      fetch('/api/admin/categories?active=true'),
    ]).then(async ([resGame, resSpecial, resNormal, resGrade]) => {
      const g = await resGame.json();
      const special = await resSpecial.json();
      const normal = await resNormal.json();
      const grade = await resGrade.json();
      setGame(resGame.ok && g?.id ? g : null);
      setSpecialCategories(resSpecial.ok && Array.isArray(special) ? special : []);
      setNormalCategories(resNormal.ok && Array.isArray(normal) ? normal : []);
      setGradeCategories(resGrade.ok && Array.isArray(grade) ? grade : []);
      if (g?.id) {
        setForm({
          title: g.title,
          description: g.description,
          thumbnailUrl: g.thumbnailUrl,
          videoUrl: g.videoUrl || '',
          specialCategoryId: g.specialCategoryId,
          normalCategoryIds: (g.normalCategories || []).map((x: { categoryId: string }) => x.categoryId),
          gradeCategoryId: g.gradeCategoryId || '',
          clubAPrice: String(g.clubAPrice),
          clubBPrice: String(g.clubBPrice),
          maxSimultaneousPerClub: String(g.maxSimultaneousPerClub),
          featured: g.featured ?? false,
        });
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const hasAnyPaid = game?.clubSlots?.some((s) => s.paymentStatus === 'PAID') ?? false;

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        setForm((f) => ({ ...f, thumbnailUrl: base + data.url }));
      } else {
        setError(data?.error || 'Erro no upload');
      }
    } catch {
      setError('Erro de conexao no upload');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/pre-sale-games/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          thumbnailUrl: form.thumbnailUrl.trim(),
          videoUrl: form.videoUrl.trim() || null,
          specialCategoryId: form.specialCategoryId || undefined,
          normalCategoryIds: form.normalCategoryIds,
          gradeCategoryId: form.gradeCategoryId.trim() || undefined,
          clubAPrice: hasAnyPaid ? undefined : parseFloat(form.clubAPrice),
          clubBPrice: hasAnyPaid ? undefined : parseFloat(form.clubBPrice),
          maxSimultaneousPerClub: parseInt(form.maxSimultaneousPerClub, 10),
          featured: form.featured,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar');
        return;
      }
      router.push(`/admin/pre-estreia/${id}`);
    } catch {
      setError('Erro de conexao');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !game) {
    return <div className="max-w-2xl mx-auto px-6 py-10 text-netflix-light">{loading ? 'Carregando...' : 'Jogo nao encontrado.'}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link href={`/admin/pre-estreia/${id}`} className="text-netflix-light hover:text-white text-sm mb-6 inline-block">← Voltar</Link>
      <h1 className="text-2xl font-bold text-white mb-8">Editar jogo — Pre-estreia</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {hasAnyPaid && <p className="text-amber-400 text-sm">Precos nao podem ser alterados apos o primeiro pagamento.</p>}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Titulo *</label>
          <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Descricao *</label>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required rows={4} className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Thumbnail *</label>
          <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
          <div className="flex gap-3 items-center flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
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
              required
              className="flex-1 min-w-[200px] px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white placeholder:text-netflix-light"
            />
          </div>
        </div>
        <StreamVideoField
          value={form.videoUrl}
          onChange={(url) => setForm((f) => ({ ...f, videoUrl: url }))}
          label="Vídeo (opcional)"
          required={false}
        />
        <div>
          <label className="block text-sm font-medium text-white mb-2">Categoria especial *</label>
          <select value={form.specialCategoryId} onChange={(e) => setForm((f) => ({ ...f, specialCategoryId: e.target.value }))} required className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white">
            {specialCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Categorias normais</label>
          <div className="flex flex-wrap gap-2">
            {normalCategories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 px-3 py-2 rounded bg-netflix-gray cursor-pointer">
                <input type="checkbox" checked={form.normalCategoryIds.includes(c.id)} onChange={(e) => setForm((f) => ({ ...f, normalCategoryIds: e.target.checked ? [...f.normalCategoryIds, c.id] : f.normalCategoryIds.filter((x) => x !== c.id) }))} />
                <span className="text-white text-sm">{c.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Categoria na grade (quando publicado)</label>
          <select value={form.gradeCategoryId} onChange={(e) => setForm((f) => ({ ...f, gradeCategoryId: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white">
            <option value="">Nenhuma / Outros</option>
            {gradeCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="text-netflix-light text-xs mt-1">Ao publicar na grade, o jogo aparecera nesta categoria.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Preco Clube A (R$) *</label>
          <input type="number" step="0.01" min="0" value={form.clubAPrice} onChange={(e) => setForm((f) => ({ ...f, clubAPrice: e.target.value }))} required disabled={hasAnyPaid} className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white disabled:opacity-60" />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Preco Clube B (R$) *</label>
          <input type="number" step="0.01" min="0" value={form.clubBPrice} onChange={(e) => setForm((f) => ({ ...f, clubBPrice: e.target.value }))} required disabled={hasAnyPaid} className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white disabled:opacity-60" />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Max. simultaneos por clube *</label>
          <input type="number" min="1" value={form.maxSimultaneousPerClub} onChange={(e) => setForm((f) => ({ ...f, maxSimultaneousPerClub: e.target.value }))} required className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white" />
        </div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} />
          <span className="text-white text-sm">Destaque</span>
        </label>
        <button type="submit" disabled={saving} className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </div>
  );
}
