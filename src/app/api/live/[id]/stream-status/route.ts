import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { canAccessLive } from '@/lib/access';
import { prisma } from '@/lib/db';
import { getLiveHlsUrl } from '@/lib/cloudflare-live';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    const live = await prisma.live.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        startAt: true,
        endAt: true,
        cloudflareLiveInputId: true,
        cloudflarePlaybackId: true,
        requireSubscription: true,
        allowOneTimePurchase: true,
      },
    });

    if (!live) {
      return NextResponse.json({ error: 'Live não encontrada' }, { status: 404 });
    }

    const now = new Date();
    const startAtDate = live.startAt ? new Date(live.startAt) : null;
    const endAtDate = live.endAt ? new Date(live.endAt) : null;

    let effectiveStatus = live.status;

    if (
      live.status === 'SCHEDULED' &&
      startAtDate &&
      startAtDate <= now &&
      (!endAtDate || endAtDate > now)
    ) {
      await prisma.live.update({
        where: { id: live.id },
        data: { status: 'LIVE' },
      });
      effectiveStatus = 'LIVE';
    } else if (live.status === 'LIVE' && endAtDate && endAtDate <= now) {
      await prisma.live.update({
        where: { id: live.id },
        data: { status: 'ENDED' },
      });
      effectiveStatus = 'ENDED';
    }

    const session = await getSession();
    const userId = session?.userId ?? null;
    const canWatch = await canAccessLive(userId, {
      id: live.id,
      requireSubscription: live.requireSubscription,
      allowOneTimePurchase: live.allowOneTimePurchase,
    });

    let hlsUrl: string | null = null;
    if (
      canWatch &&
      effectiveStatus === 'LIVE' &&
      live.cloudflareLiveInputId &&
      !live.cloudflarePlaybackId
    ) {
      try {
        hlsUrl = await getLiveHlsUrl(live.cloudflareLiveInputId);
      } catch {
        hlsUrl = null;
      }
    }

    return NextResponse.json({
      status: effectiveStatus,
      canWatch,
      hlsUrl,
      startAt: live.startAt,
    });
  } catch (e) {
    console.error('GET /api/live/[id]/stream-status', e);
    return NextResponse.json(
      { error: 'Erro ao obter status da live' },
      { status: 500 }
    );
  }
}
