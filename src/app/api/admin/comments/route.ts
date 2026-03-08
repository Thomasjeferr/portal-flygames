import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const PAGE_SIZE = 20;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all'; // game | live | all
  const status = searchParams.get('status') || 'all'; // pending | approved | rejected | all
  const gameIdFilter = searchParams.get('gameId')?.trim();
  const liveIdFilter = searchParams.get('liveId')?.trim();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? String(PAGE_SIZE), 10) || PAGE_SIZE));
  const skip = (page - 1) * limit;

  type CommentRow = {
    id: string;
    body: string;
    status: string;
    createdAt: Date;
    reviewedAt: Date | null;
    user: { id: string; name: string | null; email: string };
    game?: { id: string; title: string; slug: string } | null;
    live?: { id: string; title: string } | null;
    entityType: 'game' | 'live';
  };

  const buildWhereGame = () => {
    const where: { status?: string; gameId?: string } = {};
    if (status !== 'all') where.status = status;
    if (gameIdFilter) where.gameId = gameIdFilter;
    return where;
  };
  const buildWhereLive = () => {
    const where: { status?: string; liveId?: string } = {};
    if (status !== 'all') where.status = status;
    if (liveIdFilter) where.liveId = liveIdFilter;
    return where;
  };

  if (type === 'game') {
    const [total, gameComments] = await Promise.all([
      prisma.gameComment.count({ where: buildWhereGame() }),
      prisma.gameComment.findMany({
        where: buildWhereGame(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          body: true,
          status: true,
          createdAt: true,
          reviewedAt: true,
          user: { select: { id: true, name: true, email: true } },
          game: { select: { id: true, title: true, slug: true } },
        },
      }),
    ]);
    const comments: CommentRow[] = gameComments.map((c) => ({
      id: c.id,
      body: c.body,
      status: c.status,
      createdAt: c.createdAt,
      reviewedAt: c.reviewedAt,
      user: c.user,
      game: c.game,
      live: null,
      entityType: 'game' as const,
    }));
    return NextResponse.json({
      comments,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  }

  if (type === 'live') {
    const [total, liveComments] = await Promise.all([
      prisma.liveComment.count({ where: buildWhereLive() }),
      prisma.liveComment.findMany({
        where: buildWhereLive(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          body: true,
          status: true,
          createdAt: true,
          reviewedAt: true,
          user: { select: { id: true, name: true, email: true } },
          live: { select: { id: true, title: true } },
        },
      }),
    ]);
    const comments: CommentRow[] = liveComments.map((c) => ({
      id: c.id,
      body: c.body,
      status: c.status,
      createdAt: c.createdAt,
      reviewedAt: c.reviewedAt,
      user: c.user,
      game: null,
      live: c.live,
      entityType: 'live' as const,
    }));
    return NextResponse.json({
      comments,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  }

  // all: fetch both and merge (by createdAt desc)
  const [gameComments, liveComments, totalGame, totalLive] = await Promise.all([
    prisma.gameComment.findMany({
      where: buildWhereGame(),
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
      select: {
        id: true,
        body: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        user: { select: { id: true, name: true, email: true } },
        game: { select: { id: true, title: true, slug: true } },
      },
    }),
    prisma.liveComment.findMany({
      where: buildWhereLive(),
      orderBy: { createdAt: 'desc' },
      take: limit * 2,
      select: {
        id: true,
        body: true,
        status: true,
        createdAt: true,
        reviewedAt: true,
        user: { select: { id: true, name: true, email: true } },
        live: { select: { id: true, title: true } },
      },
    }),
    prisma.gameComment.count({ where: buildWhereGame() }),
    prisma.liveComment.count({ where: buildWhereLive() }),
  ]);
  const merged: CommentRow[] = [
    ...gameComments.map((c) => ({
      id: c.id,
      body: c.body,
      status: c.status,
      createdAt: c.createdAt,
      reviewedAt: c.reviewedAt,
      user: c.user,
      game: c.game,
      live: null as { id: string; title: string } | null,
      entityType: 'game' as const,
    })),
    ...liveComments.map((c) => ({
      id: c.id,
      body: c.body,
      status: c.status,
      createdAt: c.createdAt,
      reviewedAt: c.reviewedAt,
      user: c.user,
      game: null as { id: string; title: string; slug: string } | null,
      live: c.live,
      entityType: 'live' as const,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(skip, skip + limit);
  const total = totalGame + totalLive;
  return NextResponse.json({
    comments: merged,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  });
}
