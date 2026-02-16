import { prisma } from '@/lib/db';

export type BannerType = 'MANUAL' | 'FEATURED_GAME' | 'FEATURED_PRE_SALE' | 'FEATURED_LIVE';

export type ResolvedBanner = {
  id: string;
  type: BannerType;
  badgeText: string | null;
  headline: string | null;
  subheadline: string | null;
  useDefaultCta: boolean;
  primaryCtaText: string | null;
  primaryCtaUrl: string | null;
  secondaryCtaText: string | null;
  secondaryCtaUrl: string | null;
  mediaType: string;
  mediaUrl: string | null;
  videoStartSeconds: number;
  videoEndSeconds: number | null;
  loop: boolean;
  mute: boolean;
  overlayColorHex: string;
  overlayOpacity: number;
  heightPreset?: string;
  secondaryMediaType?: string;
  secondaryMediaUrl?: string | null;
  primaryCtaResolved?: { text: string; url: string } | null;
  secondaryCtaResolved?: { text: string; url: string } | null;
  isPreSaleMode?: boolean;
  isPublishedMode?: boolean;
};

export async function getVisibleBanners(userId?: string | null): Promise<ResolvedBanner[]> {
  const now = new Date();

  const raw = await prisma.homeBanner.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startAt: null }, { startAt: { lte: now } }] },
        { OR: [{ endAt: null }, { endAt: { gt: now } }] },
      ],
    },
    orderBy: { priority: 'asc' },
    include: {
      game: true,
      preSale: true,
      live: true,
    },
  });

  const visible: typeof raw = [];

  for (const b of raw) {
    if (b.type === 'MANUAL') {
      visible.push(b);
    } else if (b.type === 'FEATURED_GAME') {
      if (!b.game) continue;
      const game = b.game;
      const isPublished = !!game.videoUrl;
      if (b.showOnlyWhenReady && !isPublished) continue;
      visible.push(b);
    } else if (b.type === 'FEATURED_PRE_SALE') {
      if (!b.preSale) continue;
      visible.push(b);
    } else if (b.type === 'FEATURED_LIVE') {
      if (!b.live) continue;
      if (b.showOnlyWhenReady && (b.live as { status?: string }).status !== 'LIVE') continue;
      visible.push(b);
    }
  }

  const resolved = await Promise.all(
    visible.map(async (b) => {
      const cta = await resolveCta(b, userId);
      const mediaResolved = resolveMedia(b);
      const secMediaType = (b as { secondaryMediaType?: string }).secondaryMediaType ?? 'NONE';
      const secMediaUrl = (b as { secondaryMediaUrl?: string | null }).secondaryMediaUrl ?? null;
      const isLive = b.type === 'FEATURED_LIVE';
      const liveThumb = isLive && b.live?.thumbnailUrl ? b.live.thumbnailUrl : null;
      const base = {
        id: b.id,
        type: b.type as BannerType,
        badgeText: isLive && !b.badgeText?.trim() ? 'AO VIVO' : b.badgeText,
        headline: cta.headline ?? b.headline,
        subheadline: cta.subheadline ?? b.subheadline,
        useDefaultCta: b.useDefaultCta,
        primaryCtaText: b.primaryCtaText,
        primaryCtaUrl: b.primaryCtaUrl,
        secondaryCtaText: b.secondaryCtaText,
        secondaryCtaUrl: b.secondaryCtaUrl,
        mediaType: mediaResolved.mediaType,
        mediaUrl: mediaResolved.mediaUrl,
        videoStartSeconds: b.videoStartSeconds,
        videoEndSeconds: b.videoEndSeconds,
        loop: b.loop,
        mute: b.mute,
        overlayColorHex: b.overlayColorHex,
        overlayOpacity: b.overlayOpacity,
        heightPreset: (b as { heightPreset?: string }).heightPreset ?? 'md',
        secondaryMediaType: isLive && secMediaType === 'NONE' && liveThumb ? 'IMAGE' : secMediaType,
        secondaryMediaUrl: isLive && secMediaType === 'NONE' && liveThumb ? liveThumb : secMediaUrl,
        primaryCtaResolved: cta.primary,
        secondaryCtaResolved: cta.secondary,
        isPreSaleMode: cta.isPreSaleMode,
        isPublishedMode: cta.isPublishedMode,
      };
      return base;
    })
  );

  return resolved;
}

function resolveMedia(b: {
  type: string;
  mediaType: string;
  mediaUrl: string | null;
  game?: { thumbnailUrl: string | null } | null;
  preSale?: { thumbnailUrl: string } | null;
  live?: { thumbnailUrl: string | null } | null;
}): { mediaType: string; mediaUrl: string | null } {
  if (b.mediaType !== 'NONE' && b.mediaUrl?.trim()) {
    return { mediaType: b.mediaType, mediaUrl: b.mediaUrl.trim() };
  }
  if (b.type === 'FEATURED_GAME' && b.game?.thumbnailUrl) {
    return { mediaType: 'IMAGE', mediaUrl: b.game.thumbnailUrl };
  }
  if (b.type === 'FEATURED_PRE_SALE' && b.preSale?.thumbnailUrl) {
    return { mediaType: 'IMAGE', mediaUrl: b.preSale.thumbnailUrl };
  }
  if (b.type === 'FEATURED_LIVE' && b.live?.thumbnailUrl) {
    return { mediaType: 'IMAGE', mediaUrl: b.live.thumbnailUrl };
  }
  return { mediaType: 'NONE', mediaUrl: null };
}

async function resolveCta(
  b: {
    type: string;
    useDefaultCta: boolean;
    primaryCtaText: string | null;
    primaryCtaUrl: string | null;
    secondaryCtaText: string | null;
    secondaryCtaUrl: string | null;
    headline: string | null;
    subheadline: string | null;
    game?: { slug: string; title: string; videoUrl: string | null } | null;
    preSale?: { id: string; slug: string; title: string; status: string; videoUrl: string | null } | null;
    live?: { id: string; title: string; status: string; thumbnailUrl: string | null } | null;
  },
  userId?: string | null
) {
  let primary = b.useDefaultCta
    ? null
    : b.primaryCtaText && b.primaryCtaUrl
      ? { text: b.primaryCtaText, url: b.primaryCtaUrl }
      : null;
  let secondary = b.useDefaultCta
    ? null
    : b.secondaryCtaText && b.secondaryCtaUrl
      ? { text: b.secondaryCtaText, url: b.secondaryCtaUrl }
      : null;
  let headline = b.headline;
  let subheadline = b.subheadline;
  let isPreSaleMode = false;
  let isPublishedMode = false;

  if (b.type === 'FEATURED_GAME' && b.game) {
    headline = headline ?? b.game.title;
    if (b.useDefaultCta) {
      const { canAccessGameBySlug } = await import('@/lib/access');
      const hasAccess = userId ? await canAccessGameBySlug(userId, b.game.slug) : false;
      const g = b.game as unknown as { id: string; slug: string };
      primary = hasAccess
        ? { text: 'Assistir agora', url: `/jogo/${g.slug}` }
        : { text: 'Comprar jogo', url: `/checkout?gameId=${g.id}` };
      secondary = { text: 'Ver planos', url: '/planos' };
      isPublishedMode = !!b.game.videoUrl;
    }
  }

  if (b.type === 'FEATURED_PRE_SALE' && b.preSale) {
    headline = headline ?? b.preSale.title;
    if (b.useDefaultCta) {
      isPublishedMode = b.preSale.status === 'PUBLISHED' && !!b.preSale.videoUrl;
      isPreSaleMode = !isPublishedMode;
      primary = isPublishedMode
        ? { text: 'Assistir agora', url: `/pre-estreia/assistir/${b.preSale.slug}` }
        : { text: 'Garantir pré-estreia', url: `/pre-estreia/${b.preSale.id}/checkout` };
      secondary = null;
    }
  }

  if (b.type === 'FEATURED_LIVE' && b.live) {
    headline = headline ?? b.live.title;
    if (b.useDefaultCta) {
      primary = { text: 'Assistir ao vivo', url: `/live/${b.live.id}` };
      secondary = { text: 'Ver planos', url: '/planos' };
    }
  }

  if (primary === null && b.primaryCtaText && b.primaryCtaUrl) {
    primary = { text: b.primaryCtaText, url: b.primaryCtaUrl };
  }
  if (secondary === null && b.secondaryCtaText && b.secondaryCtaUrl) {
    secondary = { text: b.secondaryCtaText, url: b.secondaryCtaUrl };
  }
  if (primary === null) {
    primary = { text: 'Saiba mais', url: '/' };
  }

  return { primary, secondary, headline, subheadline, isPreSaleMode, isPublishedMode };
}
