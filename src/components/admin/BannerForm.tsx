'use client';

import { useState, useRef, useEffect } from 'react';

type Game = { id: string; title: string };
type PreSale = { id: string; title: string };
type Live = { id: string; title: string };

type FormData = {
  type: string;
  isActive: boolean;
  priority: number;
  badgeText: string;
  headline: string;
  subheadline: string;
  useDefaultCta: boolean;
  primaryCtaText: string;
  primaryCtaUrl: string;
  secondaryCtaText: string;
  secondaryCtaUrl: string;
  mediaType: string;
  mediaUrl: string;
  videoStartSeconds: number;
  videoEndSeconds: string;
  loop: boolean;
  mute: boolean;
  overlayColorHex: string;
  overlayOpacity: number;
  heightPreset: string;
  mobileMediaType: string;
  mobileMediaUrl: string;
  secondaryMediaType: string;
  secondaryMediaUrl: string;
  gameId: string;
  preSaleId: string;
  liveId: string;
  showOnlyWhenReady: boolean;
  startAt: string;
  endAt: string;
};

const defaultForm: FormData = {
  type: 'MANUAL',
  isActive: true,
  priority: 0,
  badgeText: '',
  headline: '',
  subheadline: '',
  useDefaultCta: true,
  primaryCtaText: '',
  primaryCtaUrl: '',
  secondaryCtaText: '',
  secondaryCtaUrl: '',
  mediaType: 'IMAGE',
  mediaUrl: '',
  videoStartSeconds: 0,
  videoEndSeconds: '',
  loop: true,
  mute: true,
  overlayColorHex: '#000000',
  overlayOpacity: 75,
  heightPreset: 'md',
  mobileMediaType: 'NONE',
  mobileMediaUrl: '',
  secondaryMediaType: 'NONE',
  secondaryMediaUrl: '',
  gameId: '',
  preSaleId: '',
  liveId: '',
  showOnlyWhenReady: true,
  startAt: '',
  endAt: '',
};

interface BannerFormProps {
  games: Game[];
  preSales: PreSale[];
  lives: Live[];
  initialData?: Partial<FormData>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
}

export function BannerForm({ games, preSales, lives, initialData, onSubmit }: BannerFormProps) {
  const [form, setForm] = useState<FormData>({ ...defaultForm, ...initialData });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      setForm({ ...defaultForm, ...initialData });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [error, setError] = useState('');
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingMobile, setUploadingMobile] = useState(false);
  const [uploadingJanelinha, setUploadingJanelinha] = useState(false);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);
  const janelinhaFileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadBgImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBg(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro no upload');
      if (data?.url) {
        setForm((f) => ({ ...f, mediaUrl: data.url }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar imagem');
    } finally {
      setUploadingBg(false);
      e.target.value = '';
    }
  };

  const handleUploadMobileImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMobile(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro no upload');
      if (data?.url) {
        setForm((f) => ({ ...f, mobileMediaUrl: data.url }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar imagem');
    } finally {
      setUploadingMobile(false);
      e.target.value = '';
    }
  };

  const handleUploadJanelinhaImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingJanelinha(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro no upload');
      if (data?.url) {
        setForm((f) => ({ ...f, secondaryMediaUrl: data.url }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar imagem');
    } finally {
      setUploadingJanelinha(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const mediaUrlVal = form.mediaUrl.trim() || (initialData?.mediaUrl && form.mediaType !== 'NONE' ? initialData.mediaUrl : '');
      const secondaryMediaUrlVal = form.secondaryMediaUrl.trim() || (initialData?.secondaryMediaUrl && form.secondaryMediaType !== 'NONE' ? initialData.secondaryMediaUrl : '');
      const data: Record<string, unknown> = {
        type: form.type,
        isActive: form.isActive,
        priority: form.priority,
        badgeText: form.badgeText.trim() || null,
        headline: form.headline.trim() || null,
        subheadline: form.subheadline.trim() || null,
        useDefaultCta: form.useDefaultCta,
        primaryCtaText: form.primaryCtaText.trim() || null,
        primaryCtaUrl: form.primaryCtaUrl.trim() || null,
        secondaryCtaText: form.secondaryCtaText.trim() || null,
        secondaryCtaUrl: form.secondaryCtaUrl.trim() || null,
        mediaType: form.mediaType,
        mediaUrl: mediaUrlVal || null,
        videoStartSeconds: form.videoStartSeconds,
        videoEndSeconds: form.videoEndSeconds ? parseInt(form.videoEndSeconds, 10) : null,
        loop: form.loop,
        mute: form.mute,
        overlayColorHex: form.overlayColorHex,
        overlayOpacity: form.overlayOpacity,
        heightPreset: form.heightPreset,
        mobileMediaType: form.mobileMediaType,
        mobileMediaUrl: form.mobileMediaUrl.trim() || null,
        secondaryMediaType: form.secondaryMediaType,
        secondaryMediaUrl: secondaryMediaUrlVal || null,
        gameId: form.type === 'FEATURED_GAME' ? form.gameId || null : null,
        preSaleId: form.type === 'FEATURED_PRE_SALE' ? form.preSaleId || null : null,
        liveId: form.type === 'FEATURED_LIVE' ? form.liveId || null : null,
        showOnlyWhenReady: form.showOnlyWhenReady,
        startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
      };
      await onSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-white mb-2">Tipo *</label>
        <select
          value={form.type}
          onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
        >
          <option value="MANUAL">Manual</option>
          <option value="FEATURED_GAME">Jogo em destaque</option>
          <option value="FEATURED_PRE_SALE">Pre-estreia</option>
          <option value="FEATURED_LIVE">Live ao vivo</option>
        </select>
      </div>

      {form.type === 'FEATURED_GAME' && (
        <div>
          <label className="block text-sm font-medium text-white mb-2">Jogo *</label>
          <select
            value={form.gameId}
            onChange={(e) => setForm((f) => ({ ...f, gameId: e.target.value }))}
            required
            className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
          >
            <option value="">Selecione</option>
            {games.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </div>
      )}

      {form.type === 'FEATURED_PRE_SALE' && (
        <div>
          <label className="block text-sm font-medium text-white mb-2">Pre-estreia *</label>
          <select
            value={form.preSaleId}
            onChange={(e) => setForm((f) => ({ ...f, preSaleId: e.target.value }))}
            required
            className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
          >
            <option value="">Selecione</option>
            {preSales.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      )}

      {form.type === 'FEATURED_LIVE' && (
        <div>
          <label className="block text-sm font-medium text-white mb-2">Live *</label>
          <select
            value={form.liveId}
            onChange={(e) => setForm((f) => ({ ...f, liveId: e.target.value }))}
            required
            className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
          >
            <option value="">Selecione</option>
            {lives.map((l) => (
              <option key={l.id} value={l.id}>{l.title}</option>
            ))}
          </select>
          <p className="text-xs text-netflix-light mt-1">O banner só aparece quando a live estiver com status &quot;LIVE&quot; (se &quot;Mostrar apenas quando pronto&quot; estiver ativo)</p>
        </div>
      )}

      <div className="border border-white/20 rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">Fundo do banner</h3>
          <p className="text-netflix-light text-sm mb-3">Imagem ou vídeo de fundo atrás do texto e dos botões.</p>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Tipo de fundo</label>
            <select
              value={form.mediaType}
              onChange={(e) => setForm((f) => ({ ...f, mediaType: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
            >
              <option value="NONE">Nenhum</option>
              <option value="IMAGE">Imagem</option>
              <option value="YOUTUBE_VIDEO">Vídeo YouTube</option>
              <option value="MP4_VIDEO">Vídeo MP4</option>
            </select>
          </div>
          {form.mediaType !== 'NONE' && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  {form.mediaType === 'IMAGE' ? 'URL da imagem (ou use o botão abaixo)' : 'URL da mídia *'}
                </label>
                <input
                  type="text"
                  value={form.mediaUrl}
                  onChange={(e) => setForm((f) => ({ ...f, mediaUrl: e.target.value }))}
                  required={form.type === 'MANUAL' && form.mediaType !== 'NONE'}
                  placeholder={form.mediaType === 'IMAGE' ? 'URL ou use o botão Carregar imagem' : 'Cole a URL do vídeo'}
                  className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
                />
              </div>
              {form.mediaType === 'IMAGE' && (
                <>
                  <input
                    type="file"
                    ref={bgFileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadBgImage}
                  />
                  <button
                    type="button"
                    onClick={() => bgFileInputRef.current?.click()}
                    disabled={uploadingBg}
                    className="px-4 py-2 rounded bg-white/10 text-white border border-white/30 hover:bg-white/20 disabled:opacity-50 text-sm font-medium"
                  >
                    {uploadingBg ? 'Carregando...' : 'Carregar imagem'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

      <div className="border border-white/20 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3">Fundo para mobile (opcional)</h3>
        <p className="text-netflix-light text-sm mb-3">Em telas pequenas, use uma mídia com formato adequado (ex.: imagem em pé, vídeo vertical). Se não preencher, será usada a mesma mídia do desktop.</p>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Tipo de mídia no mobile</label>
          <select
            value={form.mobileMediaType}
            onChange={(e) => setForm((f) => ({ ...f, mobileMediaType: e.target.value }))}
            className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
          >
            <option value="NONE">Usar mesmo do desktop</option>
            <option value="IMAGE">Imagem</option>
            <option value="YOUTUBE_VIDEO">Vídeo YouTube</option>
            <option value="MP4_VIDEO">Vídeo MP4</option>
          </select>
        </div>
        {form.mobileMediaType !== 'NONE' && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {form.mobileMediaType === 'IMAGE' ? 'URL da imagem (ou use o botão abaixo)' : 'URL da mídia *'}
              </label>
              <input
                type="text"
                value={form.mobileMediaUrl}
                onChange={(e) => setForm((f) => ({ ...f, mobileMediaUrl: e.target.value }))}
                required={form.mobileMediaType !== 'NONE'}
                placeholder={form.mobileMediaType === 'IMAGE' ? 'URL ou use o botão Carregar imagem' : 'Cole a URL do vídeo'}
                className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
              />
            </div>
            {form.mobileMediaType === 'IMAGE' && (
              <>
                <input
                  type="file"
                  ref={mobileFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadMobileImage}
                />
                <button
                  type="button"
                  onClick={() => mobileFileInputRef.current?.click()}
                  disabled={uploadingMobile}
                  className="px-4 py-2 rounded bg-white/10 text-white border border-white/30 hover:bg-white/20 disabled:opacity-50 text-sm font-medium"
                >
                  {uploadingMobile ? 'Carregando...' : 'Carregar imagem para mobile'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Badge (opcional)</label>
        <input
          type="text"
          value={form.badgeText}
          onChange={(e) => setForm((f) => ({ ...f, badgeText: e.target.value }))}
          placeholder="Ex: FILMAGEM COM DRONES"
          className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">Título principal</label>
        <input
          type="text"
          value={form.headline}
          onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
          placeholder="Ex: Futebol Amador"
          className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">Subtítulo</label>
        <input
          type="text"
          value={form.subheadline}
          onChange={(e) => setForm((f) => ({ ...f, subheadline: e.target.value }))}
          placeholder="Ex: visão aérea"
          className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
        />
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.useDefaultCta} onChange={(e) => setForm((f) => ({ ...f, useDefaultCta: e.target.checked }))} />
        <span className="text-white text-sm">Usar CTAs padrão (Assistir/Comprar)</span>
      </label>

      {!form.useDefaultCta && (
        <>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Botão principal - texto</label>
            <input
              type="text"
              value={form.primaryCtaText}
              onChange={(e) => setForm((f) => ({ ...f, primaryCtaText: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Botão principal - URL</label>
            <input
              type="url"
              value={form.primaryCtaUrl}
              onChange={(e) => setForm((f) => ({ ...f, primaryCtaUrl: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Botão secundário - texto</label>
            <input
              type="text"
              value={form.secondaryCtaText}
              onChange={(e) => setForm((f) => ({ ...f, secondaryCtaText: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Botão secundário - URL</label>
            <input
              type="url"
              value={form.secondaryCtaUrl}
              onChange={(e) => setForm((f) => ({ ...f, secondaryCtaUrl: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
            />
          </div>
        </>
      )}

      {(form.mediaType === 'YOUTUBE_VIDEO' || form.mediaType === 'MP4_VIDEO') && (
        <>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Início (segundos)</label>
            <input
              type="number"
              min={0}
              value={form.videoStartSeconds}
              onChange={(e) => setForm((f) => ({ ...f, videoStartSeconds: parseInt(e.target.value, 10) || 0 }))}
              className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Fim (segundos)</label>
            <input
              type="number"
              min={0}
              value={form.videoEndSeconds}
              onChange={(e) => setForm((f) => ({ ...f, videoEndSeconds: e.target.value }))}
              placeholder="Opcional"
              className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
            />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.loop} onChange={(e) => setForm((f) => ({ ...f, loop: e.target.checked }))} />
            <span className="text-white text-sm">Loop</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.mute} onChange={(e) => setForm((f) => ({ ...f, mute: e.target.checked }))} />
            <span className="text-white text-sm">Mudo</span>
          </label>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-white mb-2">Cor do overlay</label>
        <div className="flex gap-3 items-center">
          <input
            type="color"
            value={form.overlayColorHex}
            onChange={(e) => setForm((f) => ({ ...f, overlayColorHex: e.target.value }))}
            className="w-12 h-10 rounded border border-white/20 cursor-pointer"
          />
          <input
            type="text"
            value={form.overlayColorHex}
            onChange={(e) => setForm((f) => ({ ...f, overlayColorHex: e.target.value }))}
            className="flex-1 px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">Opacidade overlay (0-100): {form.overlayOpacity}</label>
        <input
          type="range"
          min={0}
          max={100}
          value={form.overlayOpacity}
          onChange={(e) => setForm((f) => ({ ...f, overlayOpacity: parseInt(e.target.value, 10) }))}
          className="w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Altura do banner</label>
        <select
          value={form.heightPreset}
          onChange={(e) => setForm((f) => ({ ...f, heightPreset: e.target.value }))}
          className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
        >
          <option value="sm">Pequena (24rem)</option>
          <option value="md">Média (28rem)</option>
          <option value="lg">Grande (36rem)</option>
          <option value="xl">Extra grande (44rem)</option>
          <option value="full">Tela cheia (100vh)</option>
        </select>
        <p className="text-xs text-netflix-light mt-1">Define a altura minima do hero</p>
      </div>

      <div className="border border-white/20 rounded-lg p-4">
        <h3 className="text-white font-medium mb-3">Janelinha (direita)</h3>
        <p className="text-netflix-light text-sm mb-3">Área à direita do banner onde pode aparecer uma imagem ou vídeo (mesma função do fundo, mas na janelinha).</p>
        <div>
          <label className="block text-sm font-medium text-white mb-2">Tipo da janelinha</label>
          <select
            value={form.secondaryMediaType}
            onChange={(e) => setForm((f) => ({ ...f, secondaryMediaType: e.target.value }))}
            className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
          >
            <option value="NONE">Nenhuma</option>
            <option value="IMAGE">Imagem</option>
            <option value="YOUTUBE_VIDEO">Vídeo YouTube</option>
            <option value="MP4_VIDEO">Vídeo MP4</option>
          </select>
        </div>
        {form.secondaryMediaType !== 'NONE' && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {form.secondaryMediaType === 'IMAGE' ? 'URL da imagem (ou use o botão abaixo)' : 'URL da janelinha *'}
              </label>
              <input
                type="text"
                value={form.secondaryMediaUrl}
                onChange={(e) => setForm((f) => ({ ...f, secondaryMediaUrl: e.target.value }))}
                required
                placeholder={form.secondaryMediaType === 'IMAGE' ? 'URL ou use o botão Carregar imagem' : 'Cole a URL do vídeo'}
                className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
              />
            </div>
            {form.secondaryMediaType === 'IMAGE' && (
              <>
                <input
                  type="file"
                  ref={janelinhaFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadJanelinhaImage}
                />
                <button
                  type="button"
                  onClick={() => janelinhaFileInputRef.current?.click()}
                  disabled={uploadingJanelinha}
                  className="px-4 py-2 rounded bg-white/10 text-white border border-white/30 hover:bg-white/20 disabled:opacity-50 text-sm font-medium"
                >
                  {uploadingJanelinha ? 'Carregando...' : 'Carregar imagem'}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">Prioridade</label>
        <input
          type="number"
          min={0}
          value={form.priority}
          onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value, 10) || 0 }))}
          className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
        />
        <p className="text-xs text-netflix-light mt-1">Menor = aparece primeiro</p>
      </div>

      {(form.type === 'FEATURED_GAME' || form.type === 'FEATURED_PRE_SALE') && (
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.showOnlyWhenReady} onChange={(e) => setForm((f) => ({ ...f, showOnlyWhenReady: e.target.checked }))} />
          <span className="text-white text-sm">Mostrar somente quando pronto (jogo publicado / vídeo disponível)</span>
        </label>
      )}

      <div>
        <label className="block text-sm font-medium text-white mb-2">Início (agendamento)</label>
        <input
          type="datetime-local"
          value={form.startAt}
          onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
          className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-white mb-2">Fim (agendamento)</label>
        <input
          type="datetime-local"
          value={form.endAt}
          onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
          className="w-full px-4 py-3 rounded bg-netflix-dark border border-white/20 text-white"
        />
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
        <span className="text-white text-sm">Ativo</span>
      </label>

      <button type="submit" disabled={saving} className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50">
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  );
}
