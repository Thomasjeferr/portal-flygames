'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from '@/lib/youtube';
import { BannerPreviewPlaceholder } from '@/components/admin/BannerPreviewPlaceholder';

type Banner = {
  id: string;
  type: string;
  headline: string | null;
  badgeText: string | null;
  isActive: boolean;
  priority: number;
  mediaType: string;
  mediaUrl: string | null;
  game?: { title: string; thumbnailUrl?: string | null } | null;
  preSale?: { title: string; thumbnailUrl?: string } | null;
};

function resolveThumbnail(raw: string | null | undefined): string | null {
  const s = raw && typeof raw === 'string' ? raw.trim() : null;
  if (!s) return null;
  const videoId = extractYouTubeVideoId(s);
  if (videoId) return getYouTubeThumbnailUrl(videoId, 'hqdefault');
  if (s.startsWith('/') || s.startsWith('http://') || s.startsWith('https://')) return s;
  return null;
}

function getBannerThumbnailUrl(b: Banner): string | null {
  const url = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

  if (b.type === 'FEATURED_GAME') {
    const mediaUrl = resolveThumbnail(b.mediaUrl);
    if (mediaUrl) return mediaUrl;
    return url(b.game?.thumbnailUrl) ?? null;
  }
  if (b.type === 'FEATURED_PRE_SALE') {
    const mediaUrl = resolveThumbnail(b.mediaUrl);
    if (mediaUrl) return mediaUrl;
    return url(b.preSale?.thumbnailUrl) ?? null;
  }
  if (b.type === 'MANUAL') {
    const mediaUrl = url(b.mediaUrl);
    if (b.mediaType === 'IMAGE' && mediaUrl) return mediaUrl;
    if ((b.mediaType === 'YOUTUBE_VIDEO' || b.mediaType === 'MP4_VIDEO') && mediaUrl) {
      return resolveThumbnail(mediaUrl);
    }
  }
  return null;
}

export default function AdminBannerPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState<string | null>(null);

  const load = () => {
    fetch('/api/admin/home-banners')
      .then((r) => r.json())
      .then((d) => setBanners(Array.isArray(d) ? d : []))
      .catch(() => setBanners([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const handleToggle = async (id: string) => {
    const res = await fetch(`/api/admin/home-banners/${id}/toggle`, { method: 'POST' });
    if (res.ok) load();
  };

  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/admin/home-banners/${id}/duplicate`, { method: 'POST' });
    if (res.ok) load();
  };

  const handleDelete = async (id: string, headline: string) => {
    if (!confirm(`Excluir banner "${headline || id}"?`)) return;
    const res = await fetch(`/api/admin/home-banners/${id}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  const move = async (idx: number, dir: 'up' | 'down') => {
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= banners.length) return;
    const arr = [...banners];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    const bannerIds = arr.map((b) => b.id);
    setReordering(banners[idx].id);
    try {
      const res = await fetch('/api/admin/home-banners/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerIds }),
      });
      if (res.ok) setBanners(arr);
    } finally {
      setReordering(null);
    }
  };

  const typeLabel: Record<string, string> = {
    MANUAL: 'Manual',
    FEATURED_GAME: 'Jogo em destaque',
    FEATURED_PRE_SALE: 'Pre-estreia',
  };

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-10 text-netflix-light">Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Hero Banners</h1>
          <p className="text-netflix-light text-sm mt-1">Carrossel configurável da home. Crie múltiplos e defina prioridade.</p>
        </div>
        <Link
          href="/admin/banner/novo"
          className="px-4 py-2 rounded bg-netflix-red text-white font-semibold hover:bg-red-600"
        >
          Novo banner
        </Link>
      </div>

      {banners.length === 0 ? (
        <div className="bg-netflix-dark border border-white/10 rounded-lg p-12 text-center">
          <p className="text-netflix-light mb-4">Nenhum banner cadastrado.</p>
          <Link href="/admin/banner/novo" className="text-netflix-red hover:underline">Criar primeiro banner</Link>
          <p className="text-netflix-light text-sm mt-4">Enquanto não houver banners, a home exibe o fallback padrão.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {banners.map((b, i) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-4 bg-netflix-dark border border-white/10 rounded-lg p-4"
            >
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(i, 'up')}
                  disabled={i === 0 || reordering === b.id}
                  className="px-2 py-1 rounded bg-netflix-gray text-white text-xs disabled:opacity-50"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 'down')}
                  disabled={i === banners.length - 1 || reordering === b.id}
                  className="px-2 py-1 rounded bg-netflix-gray text-white text-xs disabled:opacity-50"
                >
                  ↓
                </button>
              </div>
              <div className="relative w-24 h-14 rounded overflow-hidden bg-netflix-dark flex-shrink-0">
                <BannerPreviewPlaceholder
                  mediaType={b.mediaType}
                  className="absolute inset-0 w-full h-full"
                />
                {(() => {
                  const thumbUrl = getBannerThumbnailUrl(b);
                  if (thumbUrl) {
                    return (
                      <img
                        src={thumbUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover z-[1]"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{b.headline || '(sem título)'}</p>
                <p className="text-sm text-netflix-light">
                  {typeLabel[b.type] ?? b.type} • Prioridade {b.priority} • {b.isActive ? 'Ativo' : 'Inativo'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(b.id)}
                  className={`px-3 py-1 rounded text-sm ${b.isActive ? 'bg-green-900/30 text-green-400' : 'bg-netflix-gray text-netflix-light'}`}
                >
                  {b.isActive ? 'Ativo' : 'Inativo'}
                </button>
                <Link href={`/admin/banner/${b.id}/editar`} className="px-3 py-1 rounded bg-netflix-gray text-white text-sm hover:bg-white/20">
                  Editar
                </Link>
                <button
                  type="button"
                  onClick={() => handleDuplicate(b.id)}
                  className="px-3 py-1 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
                >
                  Duplicar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id, b.headline || '')}
                  className="px-3 py-1 rounded bg-red-900/30 text-red-400 text-sm hover:bg-red-900/50"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-netflix-dark/50 border border-white/10 rounded-lg">
        <p className="text-netflix-light text-sm">
          <strong>Preview:</strong> Acesse a <Link href="/" target="_blank" className="text-futvar-green hover:underline">home</Link> para ver como os banners aparecem.
        </p>
      </div>
    </div>
  );
}
