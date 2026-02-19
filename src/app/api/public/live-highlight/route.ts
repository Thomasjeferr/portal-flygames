import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();

    // Só mostra "ao vivo" se não tiver replay (quem tem cloudflarePlaybackId já encerrou).
    const liveNow = await prisma.live.findFirst({
      where: {
        status: 'LIVE',
        cloudflareLiveInputId: { not: null },
        cloudflarePlaybackId: null,
      },
      orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }],
    });

    if (liveNow) {
      return NextResponse.json({
        mode: 'LIVE',
        live: {
          id: liveNow.id,
          title: liveNow.title,
          thumbnailUrl: liveNow.thumbnailUrl,
          status: liveNow.status,
          startAt: liveNow.startAt,
          requireSubscription: liveNow.requireSubscription,
          allowOneTimePurchase: liveNow.allowOneTimePurchase,
        },
      });
    }

    const nextScheduled = await prisma.live.findFirst({
      where: {
        status: 'SCHEDULED',
        startAt: { not: null, gte: now },
      },
      orderBy: [{ startAt: 'asc' }, { createdAt: 'desc' }],
    });

    if (nextScheduled) {
      return NextResponse.json({
        mode: 'SCHEDULED',
        live: {
          id: nextScheduled.id,
          title: nextScheduled.title,
          thumbnailUrl: nextScheduled.thumbnailUrl,
          status: nextScheduled.status,
          startAt: nextScheduled.startAt,
          requireSubscription: nextScheduled.requireSubscription,
          allowOneTimePurchase: nextScheduled.allowOneTimePurchase,
        },
      });
    }

    return NextResponse.json({ mode: 'NONE', live: null });
  } catch (e) {
    console.error('GET /api/public/live-highlight', e);
    return NextResponse.json({ error: 'Erro ao carregar destaque de live' }, { status: 500 });
  }
}

