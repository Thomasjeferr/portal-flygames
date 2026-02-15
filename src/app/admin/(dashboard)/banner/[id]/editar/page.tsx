'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { BannerForm } from '@/components/admin/BannerForm';

export default function AdminBannerEditarPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [banner, setBanner] = useState<Record<string, unknown> | null>(null);
  const [games, setGames] = useState<{ id: string; title: string }[]>([]);
  const [preSales, setPreSales] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/admin/home-banners/${id}`, { cache: 'no-store' }).then((r) => r.json()).then((d) => setBanner(d?.id ? d : null)),
      fetch('/api/admin/games').then((r) => r.json()).then((d) => setGames(Array.isArray(d) ? d : [])),
      fetch('/api/admin/pre-sale-games').then((r) => r.json()).then((d) => setPreSales(Array.isArray(d) ? d : [])),
    ]).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/home-banners/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro ao salvar');
    router.push('/admin/banner');
  };

  if (loading || !banner) {
    return <div className="max-w-2xl mx-auto px-6 py-10 text-netflix-light">{loading ? 'Carregando...' : 'Banner nao encontrado.'}</div>;
  }

  const initialData: Partial<{
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
    secondaryMediaType: string;
    secondaryMediaUrl: string;
    gameId: string;
    preSaleId: string;
    showOnlyWhenReady: boolean;
    startAt: string;
    endAt: string;
  }> = {
    type: String(banner.type ?? 'MANUAL'),
    isActive: Boolean(banner.isActive ?? true),
    priority: Number(banner.priority ?? 0),
    badgeText: String(banner.badgeText ?? ''),
    headline: String(banner.headline ?? ''),
    subheadline: String(banner.subheadline ?? ''),
    useDefaultCta: Boolean(banner.useDefaultCta ?? true),
    primaryCtaText: String(banner.primaryCtaText ?? ''),
    primaryCtaUrl: String(banner.primaryCtaUrl ?? ''),
    secondaryCtaText: String(banner.secondaryCtaText ?? ''),
    secondaryCtaUrl: String(banner.secondaryCtaUrl ?? ''),
    mediaType: String(banner.mediaType ?? 'IMAGE'),
    mediaUrl: String((banner.mediaUrl ?? (banner as { media_url?: string }).media_url) ?? ''),
    videoStartSeconds: Number(banner.videoStartSeconds ?? 0),
    videoEndSeconds: banner.videoEndSeconds != null ? String(banner.videoEndSeconds) : '',
    loop: Boolean(banner.loop ?? true),
    mute: Boolean(banner.mute ?? true),
    overlayColorHex: String(banner.overlayColorHex ?? '#000000'),
    overlayOpacity: Number(banner.overlayOpacity ?? 75),
    heightPreset: String(banner.heightPreset ?? 'md'),
    secondaryMediaType: String(banner.secondaryMediaType ?? 'NONE'),
    secondaryMediaUrl: String((banner.secondaryMediaUrl ?? (banner as { secondary_media_url?: string }).secondary_media_url) ?? ''),
    gameId: String((banner.game as { id?: string })?.id ?? ''),
    preSaleId: String((banner.preSale as { id?: string })?.id ?? ''),
    showOnlyWhenReady: Boolean(banner.showOnlyWhenReady ?? true),
    startAt: banner.startAt ? new Date(banner.startAt as string).toISOString().slice(0, 16) : '',
    endAt: banner.endAt ? new Date(banner.endAt as string).toISOString().slice(0, 16) : '',
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/admin/banner" className="text-netflix-light hover:text-white text-sm mb-6 inline-block">Voltar</Link>
      <h1 className="text-2xl font-bold text-white mb-8">Editar banner</h1>
      <BannerForm key={id} games={games} preSales={preSales} initialData={initialData} onSubmit={handleSubmit} />
    </div>
  );
}
