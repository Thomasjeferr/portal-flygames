import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const now = new Date();

    // Só mostra "ao vivo" se não tiver replay (quem tem cloudflarePlaybackId já encerrou)
    // e se a live não acabou por horário (endAt null ou endAt > now).
    const liveNow = await prisma.live.findFirst({
      where: {
        status: 'LIVE',
        cloudflareLiveInputId: { not: null },
        cloudflarePlaybackId: null,
        OR: [{ endAt: null }, { endAt: { gt: now } }],
      },
      orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true } },
        awayTeam: { select: { id: true, name: true, shortName: true } },
      },
    });

    if (liveNow) {
      return NextResponse.json(
        {
          mode: 'LIVE',
          live: {
          id: liveNow.id,
          title: liveNow.title,
          thumbnailUrl: liveNow.thumbnailUrl,
          status: liveNow.status,
          startAt: liveNow.startAt,
          requireSubscription: liveNow.requireSubscription,
          allowOneTimePurchase: liveNow.allowOneTimePurchase,
          homeTeam: liveNow.homeTeam,
          awayTeam: liveNow.awayTeam,
        },
      },
        { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
      );
    }

    // Live agendada cujo horário já passou: exibir como "Ao vivo" automaticamente
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const scheduledButStarted = await prisma.live.findFirst({
      where: {
        status: 'SCHEDULED',
        startAt: { not: null, lte: now, gte: oneDayAgo },
        OR: [{ endAt: null }, { endAt: { gt: now } }],
      },
      orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true } },
        awayTeam: { select: { id: true, name: true, shortName: true } },
      },
    });

    if (scheduledButStarted) {
      return NextResponse.json(
        {
          mode: 'LIVE',
          live: {
            id: scheduledButStarted.id,
            title: scheduledButStarted.title,
            thumbnailUrl: scheduledButStarted.thumbnailUrl,
            status: scheduledButStarted.status,
            startAt: scheduledButStarted.startAt,
            requireSubscription: scheduledButStarted.requireSubscription,
            allowOneTimePurchase: scheduledButStarted.allowOneTimePurchase,
            homeTeam: scheduledButStarted.homeTeam,
            awayTeam: scheduledButStarted.awayTeam,
          },
        },
        { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
      );
    }

    const nextScheduled = await prisma.live.findFirst({
      where: {
        status: 'SCHEDULED',
        startAt: { not: null, gte: now },
      },
      orderBy: [{ startAt: 'asc' }, { createdAt: 'desc' }],
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true } },
        awayTeam: { select: { id: true, name: true, shortName: true } },
      },
    });

    if (nextScheduled) {
      return NextResponse.json(
        {
          mode: 'SCHEDULED',
          live: {
          id: nextScheduled.id,
          title: nextScheduled.title,
          thumbnailUrl: nextScheduled.thumbnailUrl,
          status: nextScheduled.status,
          startAt: nextScheduled.startAt,
          requireSubscription: nextScheduled.requireSubscription,
          allowOneTimePurchase: nextScheduled.allowOneTimePurchase,
          homeTeam: nextScheduled.homeTeam,
          awayTeam: nextScheduled.awayTeam,
        },
      },
        { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
      );
    }

    return NextResponse.json(
      { mode: 'NONE', live: null },
      { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
    );
  } catch (e) {
    console.error('GET /api/public/live-highlight', e);
    return NextResponse.json({ error: 'Erro ao carregar destaque de live' }, { status: 500 });
  }
}

