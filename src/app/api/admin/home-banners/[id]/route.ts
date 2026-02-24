import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { updateHomeBannerSchema } from '@/lib/validators/bannerSchema';

export const dynamic = 'force-dynamic';


function sanitize(body: Record<string, unknown>): Record<string, unknown> {
  const b = { ...body };
  delete (b as Record<string, unknown>).undefined;
  Object.keys(b).forEach((k) => {
    if ((b as Record<string, unknown>)[k] === undefined) {
      delete (b as Record<string, unknown>)[k];
    }
  });
  if (b.primaryCtaUrl === '') b.primaryCtaUrl = null;
  if (b.secondaryCtaUrl === '') b.secondaryCtaUrl = null;
  if (b.mediaUrl === '') b.mediaUrl = null;
  if (b.mobileMediaUrl === '') b.mobileMediaUrl = null;
  if (b.secondaryMediaUrl === '') b.secondaryMediaUrl = null;
  if (b.startAt === '') b.startAt = null;
  if (b.endAt === '') b.endAt = null;
  if (b.gameId === '') b.gameId = null;
  if (b.preSaleId === '') b.preSaleId = null;
  if (b.liveId === '') b.liveId = null;
  return b;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 });
  const id = (await params).id;
  const banner = await prisma.homeBanner.findUnique({
    where: { id },
    include: { game: true, preSale: true, live: true },
  });
  if (!banner) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
  return NextResponse.json(banner);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 });
  const id = (await params).id;
  try {
    const current = await prisma.homeBanner.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });

    const rawBody = await request.json();
    const sanitized = sanitize(rawBody);

    const parsed = updateHomeBannerSchema.safeParse(sanitized);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Invalido' }, { status: 400 });
    }

    const d = parsed.data;
    const updateData: Record<string, unknown> = {};

    if (d.isActive !== undefined) updateData.isActive = d.isActive;
    if (d.priority !== undefined) updateData.priority = d.priority;
    if (d.type !== undefined) updateData.type = d.type;
    if (d.badgeText !== undefined) updateData.badgeText = d.badgeText?.trim() || null;
    if (d.headline !== undefined) updateData.headline = d.headline?.trim() || null;
    if (d.subheadline !== undefined) updateData.subheadline = d.subheadline?.trim() || null;
    if (d.useDefaultCta !== undefined) updateData.useDefaultCta = d.useDefaultCta;
    if (d.primaryCtaText !== undefined) updateData.primaryCtaText = d.primaryCtaText?.trim() || null;
    if (d.primaryCtaUrl !== undefined) updateData.primaryCtaUrl = d.primaryCtaUrl?.trim() || null;
    if (d.secondaryCtaText !== undefined) updateData.secondaryCtaText = d.secondaryCtaText?.trim() || null;
    if (d.secondaryCtaUrl !== undefined) updateData.secondaryCtaUrl = d.secondaryCtaUrl?.trim() || null;
    if (d.videoStartSeconds !== undefined) updateData.videoStartSeconds = d.videoStartSeconds;
    if (d.videoEndSeconds !== undefined) updateData.videoEndSeconds = d.videoEndSeconds;
    if (d.loop !== undefined) updateData.loop = d.loop;
    if (d.mute !== undefined) updateData.mute = d.mute;
    if (d.overlayColorHex !== undefined) updateData.overlayColorHex = d.overlayColorHex;
    if (d.overlayOpacity !== undefined) updateData.overlayOpacity = d.overlayOpacity;
    if (d.heightPreset !== undefined) updateData.heightPreset = d.heightPreset;
    if (d.customHeightPx !== undefined) updateData.customHeightPx = d.customHeightPx;
    if (d.gameId !== undefined) updateData.gameId = d.gameId?.trim() || null;
    if (d.preSaleId !== undefined) updateData.preSaleId = d.preSaleId?.trim() || null;
    if (d.liveId !== undefined) updateData.liveId = d.liveId?.trim() || null;
    if (d.showOnlyWhenReady !== undefined) updateData.showOnlyWhenReady = d.showOnlyWhenReady;
    if (d.startAt !== undefined) updateData.startAt = d.startAt && d.startAt !== '' ? new Date(d.startAt) : null;
    if (d.endAt !== undefined) updateData.endAt = d.endAt && d.endAt !== '' ? new Date(d.endAt) : null;

    if (d.mediaType !== undefined) updateData.mediaType = d.mediaType;

    if (d.mediaUrl !== undefined) {
      const val = typeof d.mediaUrl === 'string' ? d.mediaUrl.trim() || null : d.mediaUrl;
      const type = d.mediaType ?? current.mediaType;
      if (type === 'NONE') {
        updateData.mediaUrl = null;
      } else if (val !== null && val !== '') {
        updateData.mediaUrl = val;
      } else {
        updateData.mediaUrl = current.mediaUrl;
      }
    }

    if (d.secondaryMediaType !== undefined) updateData.secondaryMediaType = d.secondaryMediaType;

    if (d.secondaryMediaUrl !== undefined) {
      const val = typeof d.secondaryMediaUrl === 'string' ? d.secondaryMediaUrl.trim() || null : d.secondaryMediaUrl;
      const type = d.secondaryMediaType ?? current.secondaryMediaType;
      if (type === 'NONE') {
        updateData.secondaryMediaUrl = null;
      } else if (val !== null && val !== '') {
        updateData.secondaryMediaUrl = val;
      } else {
        updateData.secondaryMediaUrl = current.secondaryMediaUrl;
      }
    }

    if (d.mobileMediaType !== undefined) updateData.mobileMediaType = d.mobileMediaType;
    if (d.mobileMediaUrl !== undefined) {
      const val = typeof d.mobileMediaUrl === 'string' ? d.mobileMediaUrl.trim() || null : d.mobileMediaUrl;
      const type = d.mobileMediaType ?? (current as { mobileMediaType?: string }).mobileMediaType ?? 'NONE';
      if (type === 'NONE') {
        updateData.mobileMediaUrl = null;
      } else {
        updateData.mobileMediaUrl = val ?? (current as { mobileMediaUrl?: string | null }).mobileMediaUrl;
      }
    }

    const banner = await prisma.homeBanner.update({
      where: { id },
      data: updateData as object,
      include: { game: true, preSale: true, live: true },
    });

    revalidatePath('/');
    return NextResponse.json(banner);
  } catch (e) {
    console.error('[BANNER PATCH] erro:', e);
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 });
  const id = (await params).id;
  try {
    await prisma.homeBanner.delete({ where: { id } });
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
