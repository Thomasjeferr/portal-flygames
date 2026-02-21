'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { StreamVideoField } from '@/components/admin/StreamVideoField';

interface PreSaleCategory {
  id: string;
  name: string;
  slug: string;
  type: string;
}

interface GradeCategory {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export default function AdminPreEstreiaNovoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoriesError, setCategoriesError] = useState('');
  const [specialCategories, setSpecialCategories] = useState<PreSaleCategory[]>([]);
  const [normalCategories, setNormalCategories] = useState<PreSaleCategory[]>([]);
  const [gradeCategories, setGradeCategories] = useState<GradeCategory[]>([]);
  const [teams, setTeams] = useState<Array<{ id: string; name: string; shortName: string | null }>>([]);
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
    homeTeamId: '' as string,
    awayTeamId: '' as string,
  });

  const loadCategories = () => {
    setCategoriesError('');
    Promise.all([
      fetch('/api/admin/pre-sale-categories?type=SPECIAL'),
      fetch('/api/admin/pre-sale-categories?type=NORMAL'),
      fetch('/api/admin/categories?active=true'),
      fetch('/api/admin/teams'),
    ]).then(async ([resSpecial, resNormal, resGrade, resTeams]) => {
      const specialData = await resSpecial.json();
      const normalData = await resNormal.json();
      const gradeData = await resGrade.json();
      if (!resSpecial.ok) {
        setCategoriesError(specialData?.error || 'Erro ao carregar categorias especiais');
        setSpecialCategories([]);
      } else {
        setSpecialCategories(Array.isArray(specialData) ? specialData : []);
      }
      if (!resNormal.ok) {
        setCategoriesError((prev) => prev || normalData?.error || 'Erro ao carregar categorias normais');
        setNormalCategories([]);
      } else {
        setNormalCategories(Array.isArray(normalData) ? normalData : []);
      }
      setGradeCategories(resGrade.ok && Array.isArray(gradeData) ? gradeData : []);
      const teamsData = await resTeams.json();
      setTeams(resTeams.ok && Array.isArray(teamsData) ? teamsData : []);
    }).catch(() => {
      setCategoriesError('Erro de conexao ao carregar categorias');
      setSpecialCategories([]);
      setNormalCategories([]);
      setGradeCategories([]);
      setTeams([]);
    });
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        const url = data.url.startsWith('http') ? data.url : (typeof window !== 'undefined' ? window.location.origin : '') + data.url;
        setForm((f) => ({ ...f, thumbnailUrl: url }));
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
    setLoading(true);
    try {
      const res = await fetch('/api/admin/pre-sale-games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          thumbnailUrl: form.thumbnailUrl.trim(),
          videoUrl: form.videoUrl.trim() || null,
          specialCategoryId: form.specialCategoryId || undefined,
          normalCategoryIds: form.normalCategoryIds,
          gradeCategoryId: form.gradeCategoryId.trim() || undefined,
          clubAPrice: parseFloat(form.clubAPrice) || 0,
          clubBPrice: parseFloat(form.clubBPrice) || 0,
          maxSimultaneousPerClub: parseInt(form.maxSimultaneousPerClub, 10) || 10,
          featured: form.featured,
          homeTeamId: form.homeTeamId || null,
          awayTeamId: form.awayTeamId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar');
        return;
      }
      router.push(`/admin/pre-estreia/${data.id}`);
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/admin/pre-estreia" className="text-netflix-light hover:text-white text-sm mb-6 inline-block">
        ← Voltar
      </Link>
      <h1 className="text-2xl font-bold text-white mb-8">Novo jogo — Pré-estreia</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-white mb-2">Título *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Times (opcional)</label>
          <p className="text-xs text-netflix-light mb-2">Mandante x Visitante — ex.: Time A x Time B</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-netflix-light mb-1">Mandante</label>
              <select
                value={form.homeTeamId}
                onChange={(e) => setForm((f) => ({ ...f, homeTeamId: e.target.value }))}
                className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
              >
                <option value="">— Selecionar —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.shortName || t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-netflix-light mb-1">Visitante</label>
              <select
                value={form.awayTeamId}
                onChange={(e) => setForm((f) => ({ ...f, awayTeamId: e.target.value }))}
                className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
              >
                <option value="">— Selecionar —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.shortName || t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Descrição *</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            required
            rows={4}
            className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
          />
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
        <div>
          <label className="block text-sm font-medium text-white mb-2">Categoria especial (SPECIAL) *</label>
          <select
            value={form.specialCategoryId}
            onChange={(e) => setForm((f) => ({ ...f, specialCategoryId: e.target.value }))}
            required
            className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
          >
            <option value="">Selecione</option>
            {specialCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {categoriesError && <p className="text-amber-400 text-sm mt-1">{categoriesError}</p>}
          {specialCategories.length === 0 && !categoriesError && (
            <p className="text-netflix-light text-sm mt-1">
              Nenhuma categoria especial. <Link href="/admin/pre-estreia/categorias" className="text-futvar-green hover:underline">Criar categorias</Link>
              {' · '}
              <button type="button" onClick={loadCategories} className="text-futvar-green hover:underline">Recarregar</button>
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Categorias normais (NORMAL)</label>
          <select
            multiple
            value={form.normalCategoryIds}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (o) => o.value);
              setForm((f) => ({ ...f, normalCategoryIds: selected }));
            }}
            className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white min-h-[100px]"
          >
            {normalCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {normalCategories.length === 0 && !categoriesError && (
            <p className="text-netflix-light text-sm mt-1">
              Nenhuma categoria normal. <Link href="/admin/pre-estreia/categorias" className="text-futvar-green hover:underline">Criar categorias</Link>
              {' · '}
              <button type="button" onClick={loadCategories} className="text-futvar-green hover:underline">Recarregar</button>
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Categoria na grade (quando publicado)</label>
          <select
            value={form.gradeCategoryId}
            onChange={(e) => setForm((f) => ({ ...f, gradeCategoryId: e.target.value }))}
            className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
          >
            <option value="">Nenhuma / Outros</option>
            {gradeCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <p className="text-netflix-light text-xs mt-1">Ao publicar na grade, o jogo aparecerá nesta categoria para usuários comprarem.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Preço Clube A (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.clubAPrice}
              onChange={(e) => setForm((f) => ({ ...f, clubAPrice: e.target.value }))}
              required
              className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Preço Clube B (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.clubBPrice}
              onChange={(e) => setForm((f) => ({ ...f, clubBPrice: e.target.value }))}
              required
              className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Max. simultâneos por clube *</label>
          <input
            type="number"
            min="1"
            value={form.maxSimultaneousPerClub}
            onChange={(e) => setForm((f) => ({ ...f, maxSimultaneousPerClub: e.target.value }))}
            required
            className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
          />
        </div>
        <StreamVideoField
          value={form.videoUrl}
          onChange={(url) => setForm((f) => ({ ...f, videoUrl: url }))}
          label="Vídeo (opcional)"
          required={false}
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? 'Criando...' : 'Criar jogo'}
        </button>
      </form>
    </div>
  );
}
