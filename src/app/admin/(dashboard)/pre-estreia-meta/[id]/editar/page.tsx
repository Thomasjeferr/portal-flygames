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
  specialCategoryId: string | null;
  gradeCategoryId: string | null;
  featured: boolean;
  clubSlots: { paymentStatus: string }[];
  normalCategories: { categoryId: string }[];
  metaEnabled?: boolean | null;
  metaExtraPerTeam?: number | null;
  homeTeam?: { id: string } | null;
  awayTeam?: { id: string } | null;
}

export default function AdminPreEstreiaMetaEditarPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [specialCategories, setSpecialCategories] = useState<PreSaleCategory[]>([]);
  const [normalCategories, setNormalCategories] = useState<PreSaleCategory[]>([]);
  const [gradeCategories, setGradeCategories] = useState<GradeCategory[]>([]);
  const [teams, setTeams] = useState<Array<{ id: string; name: string; shortName: string | null }>>([]);
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
    featured: false,
    homeTeamId: '' as string,
    awayTeamId: '' as string,
    metaExtraPerTeam: '10',
    premiereDate: '',
    premiereTime: '',
  });

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/pre-sale-games/${id}`)
      .then((resGame) => resGame.json())
      .then((g) => {
        if (g?.id && !g?.metaEnabled) {
          router.replace('/admin/pre-estreia-meta');
          return null;
        }
        return Promise.all([
          Promise.resolve(g),
          fetch('/api/admin/pre-sale-categories?type=SPECIAL&scope=META'),
          fetch('/api/admin/pre-sale-categories?type=NORMAL&scope=META'),
          fetch('/api/admin/categories?active=true&limit=100'),
          fetch('/api/admin/teams?limit=100'),
        ]);
      })
      .then((result) => {
        if (!result) return;
        const [g, resSpecial, resNormal, resGrade, resTeams] = result;
        return Promise.all([resSpecial.json(), resNormal.json(), resGrade.json(), resTeams.json()]).then(([special, normal, grade, teamsData]) => ({
          g,
          special,
          normal,
          grade,
          teamsData,
          resSpecial,
          resGrade,
          resTeams,
        }));
      })
      .then((data) => {
        if (!data) return;
        const { g, special, normal, grade, teamsData, resSpecial, resGrade, resTeams } = data;
        setGame(g?.id ? g : null);
        setSpecialCategories(resSpecial.ok && Array.isArray(special) ? special : []);
        setNormalCategories(Array.isArray(normal) ? normal : []);
        setGradeCategories(resGrade.ok && Array.isArray(grade?.categories) ? grade.categories : []);
        setTeams(resTeams.ok && Array.isArray(teamsData?.teams) ? teamsData.teams : []);
        if (g?.id) {
          setForm({
            title: g.title,
            description: g.description,
            thumbnailUrl: g.thumbnailUrl,
            videoUrl: g.videoUrl || '',
            specialCategoryId: g.specialCategoryId || '',
            normalCategoryIds: (g.normalCategories || []).map((x: { categoryId: string }) => x.categoryId),
            gradeCategoryId: g.gradeCategoryId || '',
            featured: g.featured ?? false,
            homeTeamId: g.homeTeamId ?? g.homeTeam?.id ?? '',
            awayTeamId: g.awayTeamId ?? g.awayTeam?.id ?? '',
            metaExtraPerTeam: String(Math.max(1, Number(g.metaExtraPerTeam) || 10)),
            premiereDate: g.premiereAt ? new Date(g.premiereAt).toISOString().slice(0, 10) : '',
            premiereTime: g.premiereAt ? `${String(new Date(g.premiereAt).getHours()).padStart(2, '0')}:${String(new Date(g.premiereAt).getMinutes()).padStart(2, '0')}` : '',
          });
        }
      })
      .catch(() => setGame(null))
      .finally(() => setLoading(false));
  }, [id, router]);

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
          featured: form.featured,
          homeTeamId: form.homeTeamId || null,
          awayTeamId: form.awayTeamId || null,
          metaExtraPerTeam: Math.max(1, parseInt(form.metaExtraPerTeam, 10) || 10),
          premiereAt: form.premiereDate && form.premiereTime ? new Date(`${form.premiereDate}T${form.premiereTime}`).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar');
        return;
      }
      router.push('/admin/pre-estreia-meta');
    } catch {
      setError('Erro de conexao');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !game) {
    return <div className="max-w-2xl mx-auto px-6 py-10 text-netflix-light">{loading ? 'Carregando...' : 'Jogo não encontrado.'}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link href={`/admin/pre-estreia-meta/${id}`} className="text-netflix-light hover:text-white text-sm mb-6 inline-block">← Voltar</Link>
      <h1 className="text-2xl font-bold text-white mb-8">Editar jogo — Pré-estreia Meta</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="rounded-lg border border-futvar-green/30 bg-futvar-dark/60 p-3 text-xs text-futvar-light flex items-center justify-between gap-3">
          <span className="font-semibold text-white">Meta de assinantes por time</span>
          <span className="px-2 py-1 rounded-full bg-futvar-green/15 text-futvar-green text-[11px] font-semibold">
            Meta: {form.metaExtraPerTeam} patrocinadores torcedores/time
          </span>
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Título *</label>
          <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Times (Mandante x Visitante) *</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-netflix-light mb-1">Mandante</label>
              <select
                value={form.homeTeamId}
                onChange={(e) => setForm((f) => ({ ...f, homeTeamId: e.target.value }))}
                required
                className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
              >
                <option value="">— Selecionar —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.shortName ? `${t.name} (${t.shortName})` : t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-netflix-light mb-1">Visitante</label>
              <select
                value={form.awayTeamId}
                onChange={(e) => setForm((f) => ({ ...f, awayTeamId: e.target.value }))}
                required
                className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
              >
                <option value="">— Selecionar —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.shortName ? `${t.name} (${t.shortName})` : t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Descrição *</label>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required rows={4} className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Estreia do jogo (informativo)</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-netflix-light mb-1">Data da estreia</label>
              <input type="date" value={form.premiereDate} onChange={(e) => setForm((f) => ({ ...f, premiereDate: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white" />
            </div>
            <div>
              <label className="block text-xs text-netflix-light mb-1">Horário da estreia</label>
              <input type="time" value={form.premiereTime} onChange={(e) => setForm((f) => ({ ...f, premiereTime: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white" />
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Thumbnail *</label>
          <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
          <div className="flex gap-3 items-center flex-wrap">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 rounded bg-netflix-gray text-white text-sm hover:bg-white/20">Upload imagem</button>
            <span className="text-xs text-netflix-light">ou</span>
            <input type="url" value={form.thumbnailUrl} onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))} placeholder="Cole a URL da imagem" required className="flex-1 min-w-[200px] px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white placeholder:text-netflix-light" />
          </div>
        </div>
        <StreamVideoField value={form.videoUrl} onChange={(url) => setForm((f) => ({ ...f, videoUrl: url }))} label="Vídeo (opcional)" required={false} />
        <div>
          <label className="block text-sm font-medium text-white mb-2">Categoria especial (opcional)</label>
          <select value={form.specialCategoryId} onChange={(e) => setForm((f) => ({ ...f, specialCategoryId: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white">
            <option value="">— Nenhuma —</option>
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
            {gradeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Meta por time (total de patrocinadores torcedores) *</label>
          <input type="number" min={1} value={form.metaExtraPerTeam} onChange={(e) => setForm((f) => ({ ...f, metaExtraPerTeam: e.target.value }))} required className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white" />
          <p className="text-xs text-netflix-light mt-1">Total de patrocinadores torcedores que cada time precisa para liberar o jogo.</p>
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
