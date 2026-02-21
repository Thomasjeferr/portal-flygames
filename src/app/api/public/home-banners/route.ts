import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getVisibleBanners } from '@/services/bannerVisibilityService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    const userId = session?.userId ?? null;
    const banners = await getVisibleBanners(userId);

    if (banners.length === 0) {
      return NextResponse.json({
        banners: [],
        fallback: {
          badgeText: 'FILMAGEM COM DRONES',
          headline: 'Futebol de várzea',
          subheadline: 'visão aérea',
          description: 'Assista às melhores partidas filmadas com drones.',
          primaryCta: { text: 'Começar a assistir', url: '/cadastro' },
          secondaryCta: { text: 'Já tenho conta', url: '/entrar' },
        },
      });
    }

    const payload = banners.map((b) => ({
      id: b.id,
      type: b.type,
      badgeText: b.badgeText,
      headline: b.headline,
      subheadline: b.subheadline,
      primaryCta: b.primaryCtaResolved ?? { text: 'Saiba mais', url: '/' },
      secondaryCta: b.secondaryCtaResolved ?? null,
      mediaType: b.mediaType,
      mediaUrl: b.mediaUrl,
      mobileMediaType: b.mobileMediaType ?? 'NONE',
      mobileMediaUrl: b.mobileMediaUrl ?? null,
      videoStartSeconds: b.videoStartSeconds,
      videoEndSeconds: b.videoEndSeconds,
      loop: b.loop,
      mute: b.mute,
      overlayColorHex: b.overlayColorHex,
      overlayOpacity: b.overlayOpacity,
      heightPreset: b.heightPreset ?? 'md',
      secondaryMediaType: b.secondaryMediaType ?? 'NONE',
      secondaryMediaUrl: b.secondaryMediaUrl ?? null,
    }));

    return NextResponse.json(
      { banners: payload },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'Erro ao carregar banners' },
      { status: 500 }
    );
  }
}
