import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createHomeBannerSchema } from '@/lib/validators/bannerSchema';

function sanitize(body: Record<string, unknown>) {
  const b = { ...body };
  if (b.primaryCtaUrl === '') b.primaryCtaUrl = null;
  if (b.secondaryCtaUrl === '') b.secondaryCtaUrl = null;
  if (b.mediaUrl === '') b.mediaUrl = null;
  if (b.mobileMediaUrl === '') b.mobileMediaUrl = null;
  if (b.startAt === '') b.startAt = null;
  if (b.endAt === '') b.endAt = null;
  if (b.gameId === '') b.gameId = null;
  if (b.preSaleId === '') b.preSaleId = null;
  if (b.liveId === '') b.liveId = null;
  return b;
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 });
  const banners = await prisma.homeBanner.findMany({
    orderBy: { priority: 'asc' },
    include: {
      game: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
      preSale: { select: { id: true, title: true, slug: true, thumbnailUrl: true } },
      live: { select: { id: true, title: true, thumbnailUrl: true, status: true } },
    },
  });
  return NextResponse.json(banners);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 });
  try {
    const parsed = createHomeBannerSchema.safeParse(sanitize(await request.json()));
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalido' }, { status: 400 });
    const d = parsed.data;
    const banner = await prisma.homeBanner.create({
      data: {
        isActive: d.isActive ?? true,
        priority: d.priority ?? 0,
        type: d.type,
        badgeText: d.badgeText?.trim() || null,
        headline: d.headline?.trim() || null,
        subheadline: d.subheadline?.trim() || null,
        useDefaultCta: d.useDefaultCta ?? true,
        primaryCtaText: d.primaryCtaText?.trim() || null,
        primaryCtaUrl: d.primaryCtaUrl?.trim() || null,
        secondaryCtaText: d.secondaryCtaText?.trim() || null,
        secondaryCtaUrl: d.secondaryCtaUrl?.trim() || null,
        mediaType: d.mediaType ?? 'NONE',
        mediaUrl: d.mediaUrl?.trim() || null,
        videoStartSeconds: d.videoStartSeconds ?? 0,
        videoEndSeconds: d.videoEndSeconds ?? null,
        loop: d.loop ?? true,
        mute: d.mute ?? true,
        mobileMediaType: d.mobileMediaType ?? 'NONE',
        mobileMediaUrl: d.mobileMediaUrl?.trim() || null,
        overlayColorHex: d.overlayColorHex ?? '#000000',
        overlayOpacity: d.overlayOpacity ?? 75,
        heightPreset: d.heightPreset ?? 'md',
        secondaryMediaType: d.secondaryMediaType ?? 'NONE',
        secondaryMediaUrl: d.secondaryMediaUrl?.trim() || null,
        gameId: d.gameId?.trim() || null,
        preSaleId: d.preSaleId?.trim() || null,
        liveId: d.liveId?.trim() || null,
        showOnlyWhenReady: d.showOnlyWhenReady ?? true,
        startAt: d.startAt && d.startAt !== '' ? new Date(d.startAt) : null,
        endAt: d.endAt && d.endAt !== '' ? new Date(d.endAt) : null,
      },
      include: { game: true, preSale: true, live: true },
    });
    revalidatePath('/');
    return NextResponse.json(banner);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao criar' }, { status: 500 });
  }
}
