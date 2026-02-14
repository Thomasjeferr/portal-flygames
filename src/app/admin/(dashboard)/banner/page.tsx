'use client';

import { useEffect, useState } from 'react';

type HeroType = 'none' | 'image' | 'youtube' | 'pandavideo';

interface HeroForm {
  heroType: HeroType;
  heroMediaUrl: string;
  overlayColor: string;
  overlayOpacity: number;
  videoStartSeconds: string;
  videoEndSeconds: string;
  videoLoop: boolean;
}

export default function AdminBannerPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<HeroForm>({
    heroType: 'none',
    heroMediaUrl: '',
    overlayColor: '#000000',
    overlayOpacity: 0.5,
    videoStartSeconds: '',
    videoEndSeconds: '',
    videoLoop: true,
  });

  useEffect(() => {
    fetch('/api/admin/hero-config')
      .then((r) => r.json())
      .then((data) => {
        setForm({
          heroType: (data.heroType || 'none') as HeroType,
          heroMediaUrl: data.heroMediaUrl || '',
          overlayColor: data.overlayColor || '#000000',
          overlayOpacity: typeof data.overlayOpacity === 'number' ? data.overlayOpacity : 0.5,
          videoStartSeconds: data.videoStartSeconds != null ? String(data.videoStartSeconds) : '',
          videoEndSeconds: data.videoEndSeconds != null ? String(data.videoEndSeconds) : '',
          videoLoop: data.videoLoop !== false,
        });
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const start = form.videoStartSeconds.trim() ? parseInt(form.videoStartSeconds, 10) : null;
      const end = form.videoEndSeconds.trim() ? parseInt(form.videoEndSeconds, 10) : null;
      const body = {
        heroType: form.heroType,
        heroMediaUrl: form.heroType !== 'none' && form.heroMediaUrl.trim() ? form.heroMediaUrl.trim() : null,
        overlayColor: form.overlayColor,
        overlayOpacity: form.overlayOpacity,
        videoStartSeconds: start != null && !isNaN(start) ? start : null,
        videoEndSeconds: end != null && !isNaN(end) ? end : null,
        videoLoop: form.videoLoop,
      };
      const res = await fetch('/api/admin/hero-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar');
        return;
      }
      setSuccess('Banner salvo. A home foi atualizada.');
      setForm((f) => ({
        ...f,
        heroMediaUrl: data.heroMediaUrl || '',
        overlayColor: data.overlayColor ?? f.overlayColor,
        overlayOpacity: data.overlayOpacity ?? f.overlayOpacity,
        videoStartSeconds: data.videoStartSeconds != null ? String(data.videoStartSeconds) : '',
        videoEndSeconds: data.videoEndSeconds != null ? String(data.videoEndSeconds) : '',
        videoLoop: data.videoLoop !== false,
      }));
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

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-white mb-2">Banner da home</h1>
      <p className="text-netflix-light mb-8">
        Imagem ou vídeo de fundo do topo da página. Ajuste a cor e a intensidade da sobreposição para o texto ficar legível.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <p className="text-amber-400 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
            {success}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-white mb-2">Tipo de fundo</label>
          <select
            value={form.heroType}
            onChange={(e) => setForm((f) => ({ ...f, heroType: e.target.value as HeroType }))}
            className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          >
            <option value="none">Nenhum (padrão do tema)</option>
            <option value="image">Imagem</option>
            <option value="youtube">Vídeo YouTube</option>
            <option value="pandavideo">Vídeo PandaVideo</option>
          </select>
        </div>

        {(form.heroType === 'youtube' || form.heroType === 'pandavideo') && (
          <>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Início do vídeo (segundos)</label>
              <input
                type="number"
                min={0}
                value={form.videoStartSeconds}
                onChange={(e) => setForm((f) => ({ ...f, videoStartSeconds: e.target.value }))}
                placeholder="Ex: 60 = 1 min"
                className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white placeholder-netflix-light/60 focus:outline-none focus:ring-2 focus:ring-netflix-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">Fim do vídeo (segundos)</label>
              <input
                type="number"
                min={0}
                value={form.videoEndSeconds}
                onChange={(e) => setForm((f) => ({ ...f, videoEndSeconds: e.target.value }))}
                placeholder="Ex: 180 = 3 min"
                className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white placeholder-netflix-light/60 focus:outline-none focus:ring-2 focus:ring-netflix-red"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="videoLoop"
                checked={form.videoLoop}
                onChange={(e) => setForm((f) => ({ ...f, videoLoop: e.target.checked }))}
                className="w-4 h-4 rounded accent-netflix-red"
              />
              <label htmlFor="videoLoop" className="text-sm font-medium text-white">
                Loop (repetir vídeo)
              </label>
            </div>
          </>
        )}
        {(form.heroType === 'image' || form.heroType === 'youtube' || form.heroType === 'pandavideo') && (
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {form.heroType === 'image' ? 'URL da imagem' : 'URL do vídeo (embed ou link)'}
            </label>
            <input
              type="url"
              value={form.heroMediaUrl}
              onChange={(e) => setForm((f) => ({ ...f, heroMediaUrl: e.target.value }))}
              placeholder={
                form.heroType === 'image'
                  ? 'https://exemplo.com/imagem.jpg'
                  : form.heroType === 'youtube'
                    ? 'https://www.youtube.com/watch?v=... ou https://youtube.com/embed/...'
                    : 'https://player.pandavideo.com.br/embed/...'
              }
              className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white placeholder-netflix-light/60 focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-white mb-2">Cor da sobreposição</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.overlayColor}
              onChange={(e) => setForm((f) => ({ ...f, overlayColor: e.target.value }))}
              className="w-12 h-10 rounded border border-white/20 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={form.overlayColor}
              onChange={(e) => setForm((f) => ({ ...f, overlayColor: e.target.value }))}
              placeholder="#000000"
              className="flex-1 px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
          <p className="text-xs text-netflix-light mt-1">Cor em hex (ex: #000000). A sobreposição escurece o fundo para o texto ficar legível.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Intensidade da sobreposição: {Math.round(form.overlayOpacity * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={form.overlayOpacity}
            onChange={(e) => setForm((f) => ({ ...f, overlayOpacity: parseFloat(e.target.value) }))}
            className="w-full h-2 rounded-lg appearance-none bg-netflix-gray accent-netflix-red"
          />
          <p className="text-xs text-netflix-light mt-1">0% = transparente, 100% = opaco. Quanto maior, mais escuro sobre o fundo.</p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar banner'}
        </button>
      </form>
    </div>
  );
}
