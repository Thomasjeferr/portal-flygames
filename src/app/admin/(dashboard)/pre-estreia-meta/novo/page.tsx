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

export default function AdminPreEstreiaMetaNovoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoriesError, setCategoriesError] = useState('');
  const [normalCategories, setNormalCategories] = useState<PreSaleCategory[]>([]);
  const [gradeCategories, setGradeCategories] = useState<GradeCategory[]>([]);
  const [teams, setTeams] = useState<Array<{ id: string; name: string; shortName: string | null }>>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    thumbnailUrl: '',
    videoUrl: '',
    normalCategoryIds: [] as string[],
    gradeCategoryId: '',
    metaExtraPerTeam: '10',
    featured: false,
    homeTeamId: '' as string,
    awayTeamId: '' as string,
    premiereDate: '',
    premiereTime: '',
  });

  const safeJson = async (res: Response): Promise<unknown> => {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return { error: res.ok ? 'Resposta inválida' : `Servidor retornou status ${res.status}. Verifique se as migrações do banco foram aplicadas (npx prisma migrate deploy).` };
    }
  };

  const loadCategories = () => {
    setCategoriesError('');
    Promise.all([
      fetch('/api/admin/pre-sale-categories?type=NORMAL&scope=META'),
      fetch('/api/admin/categories?active=true&limit=100'),
      fetch('/api/admin/teams?limit=100'),
    ]).then(async ([resNormal, resGrade, resTeams]) => {
      const normalData = (await safeJson(resNormal)) as { error?: string } | unknown[];
      const gradeData = (await safeJson(resGrade)) as { categories?: GradeCategory[] };
      const teamsData = (await safeJson(resTeams)) as { teams?: { id: string; name: string; shortName: string | null }[] };
      if (!resNormal.ok) {
        const msg =
          typeof normalData === 'object' && normalData !== null && 'error' in normalData
            ? String((normalData as { error: string }).error)
            : 'Erro ao carregar categorias normais';
        setCategoriesError(msg);
        setNormalCategories([]);
      } else {
        const list = Array.isArray(normalData) ? (normalData as PreSaleCategory[]) : [];
        setNormalCategories(list);
      }
      const gradeList =
        resGrade.ok && Array.isArray(gradeData?.categories) ? gradeData.categories : [];
      setGradeCategories(gradeList);
      const teamsList =
        resTeams.ok && Array.isArray(teamsData?.teams) ? teamsData.teams : [];
      setTeams(teamsList);
    }).catch((err) => {
      setCategoriesError(err?.message ? `Erro: ${err.message}` : 'Erro de conexão ao carregar categorias');
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
          normalCategoryIds: form.normalCategoryIds,
          gradeCategoryId: form.gradeCategoryId.trim() || undefined,
          clubAPrice: 0,
          clubBPrice: 0,
          maxSimultaneousPerClub: 1,
          featured: form.featured,
          metaEnabled: true,
          metaExtraPerTeam: parseInt(form.metaExtraPerTeam, 10) || 10,
          homeTeamId: form.homeTeamId || null,
          awayTeamId: form.awayTeamId || null,
          premiereAt: form.premiereDate && form.premiereTime ? new Date(`${form.premiereDate}T${form.premiereTime}`).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar');
        return;
      }
      router.push(`/admin/pre-estreia-meta`);
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/admin/pre-estreia-meta" className="text-netflix-light hover:text-white text-sm mb-6 inline-block">
        ← Voltar
      </Link>
      <h1 className="text-2xl font-bold text-white mb-8">Novo jogo — Pré-estreia Meta</h1>
      <p className="text-netflix-light text-sm mb-6">
        O jogo será liberado quando as duas torcidas baterem a meta de novos assinantes. Defina mandante e visitante e quantos assinantes a mais cada time precisa.
      </p>

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
          <label className="block text-sm font-medium text-white mb-2">Times (Mandante x Visitante) *</label>
          <p className="text-xs text-netflix-light mb-2">Obrigatório para calcular a meta por torcida.</p>
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
                {teams.map((t) => {
                  const label = t.shortName ? `${t.name} (${t.shortName})` : t.name;
                  return <option key={t.id} value={t.id}>{label}</option>;
                })}
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
                {teams.map((t) => {
                  const label = t.shortName ? `${t.name} (${t.shortName})` : t.name;
                  return <option key={t.id} value={t.id}>{label}</option>;
                })}
              </select>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Meta extra por time (novos assinantes) *</label>
          <input
            type="number"
            min={1}
            value={form.metaExtraPerTeam}
            onChange={(e) => setForm((f) => ({ ...f, metaExtraPerTeam: e.target.value }))}
            required
            className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
          />
          <p className="text-xs text-netflix-light mt-1">
            Ex.: 10 → cada time precisa de <strong>+10 assinantes</strong> em relação ao que já tem hoje para liberar o jogo.
          </p>
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
          <label className="block text-sm font-medium text-white mb-2">Estreia do jogo (informativo)</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-netflix-light mb-1">Data da estreia</label>
              <input
                type="date"
                value={form.premiereDate}
                onChange={(e) => setForm((f) => ({ ...f, premiereDate: e.target.value }))}
                className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-netflix-light mb-1">Horário da estreia</label>
              <input
                type="time"
                value={form.premiereTime}
                onChange={(e) => setForm((f) => ({ ...f, premiereTime: e.target.value }))}
                className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
              />
            </div>
          </div>
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
        {categoriesError && <p className="text-amber-400 text-sm">{categoriesError}</p>}
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
        </div>
        <StreamVideoField
          value={form.videoUrl}
          onChange={(url) => setForm((f) => ({ ...f, videoUrl: url }))}
          label="Vídeo (opcional)"
          required={false}
        />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} />
          <span className="text-white text-sm">Destaque</span>
        </label>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? 'Criando...' : 'Criar jogo Meta'}
        </button>
      </form>
    </div>
  );
}
