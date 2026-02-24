import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createPreSaleGameSchema } from '@/lib/pre-sale/validations';
import { uniqueSlug } from '@/lib/slug';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  try {
    const games = await prisma.preSaleGame.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        homeTeam: { select: { id: true, name: true, slug: true } },
        awayTeam: { select: { id: true, name: true, slug: true } },
        specialCategory: true,
        normalCategories: { include: { category: true } },
        clubSlots: { orderBy: { slotIndex: 'asc' } },
      },
    });
    return NextResponse.json(games);
  } catch (e) {
    console.error('GET /api/admin/pre-sale-games', e);
    const message = e instanceof Error ? e.message : 'Erro ao listar jogos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const parsed = createPreSaleGameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const existingSlugs = (await prisma.preSaleGame.findMany({ select: { slug: true } })).map((g) => g.slug);
    const slug = uniqueSlug(data.title, existingSlugs);

    const normalCatIds = Array.isArray(data.normalCategoryIds) ? data.normalCategoryIds.filter(Boolean) : [];
    const gradeCategoryId = data.gradeCategoryId?.trim() || null;

    const isMeta = data.metaEnabled === true;
    const metaExtra = isMeta ? (data.metaExtraPerTeam ?? 0) : 0;
    let baselineHomeSubs: number | null = null;
    let baselineAwaySubs: number | null = null;
    let metaHomeTotal: number | null = null;
    let metaAwayTotal: number | null = null;

    if (isMeta && metaExtra >= 1 && data.homeTeamId && data.awayTeamId) {
      const [homeCount, awayCount] = await Promise.all([
        prisma.subscription.count({
          where: { active: true, user: { favoriteTeamId: data.homeTeamId } },
        }),
        prisma.subscription.count({
          where: { active: true, user: { favoriteTeamId: data.awayTeamId } },
        }),
      ]);
      baselineHomeSubs = homeCount;
      baselineAwaySubs = awayCount;
      metaHomeTotal = homeCount + metaExtra;
      metaAwayTotal = awayCount + metaExtra;
    }

    const specialCategoryId = data.specialCategoryId?.trim() || null;
    const premiereAtRaw = data.premiereAt && typeof data.premiereAt === 'string' ? data.premiereAt.trim() : '';
    const premiereAt = premiereAtRaw ? (() => { const d = new Date(premiereAtRaw); return isNaN(d.getTime()) ? null : d; })() : null;

    const createData: Parameters<typeof prisma.preSaleGame.create>[0]['data'] = {
      title: data.title,
      description: data.description,
      thumbnailUrl: data.thumbnailUrl,
      videoUrl: data.videoUrl?.trim() || null,
      ...(specialCategoryId ? { specialCategoryId } : {}),
      gradeCategoryId: gradeCategoryId || undefined,
      clubAPrice: isMeta ? 0 : data.clubAPrice,
      clubBPrice: isMeta ? 0 : data.clubBPrice,
      maxSimultaneousPerClub: isMeta ? 1 : data.maxSimultaneousPerClub,
      featured: data.featured ?? false,
      slug,
      homeTeamId: data.homeTeamId?.trim() || null,
      awayTeamId: data.awayTeamId?.trim() || null,
      ...(premiereAt ? { premiereAt } : {}),
      normalCategories: normalCatIds.length > 0
        ? { create: normalCatIds.map((categoryId: string) => ({ categoryId })) }
        : undefined,
    };

    if (isMeta) {
      (createData as Record<string, unknown>).metaEnabled = true;
      (createData as Record<string, unknown>).metaExtraPerTeam = metaExtra;
      (createData as Record<string, unknown>).baselineHomeSubs = baselineHomeSubs;
      (createData as Record<string, unknown>).baselineAwaySubs = baselineAwaySubs;
      (createData as Record<string, unknown>).metaHomeTotal = metaHomeTotal;
      (createData as Record<string, unknown>).metaAwayTotal = metaAwayTotal;
    }

    const game = await prisma.preSaleGame.create({
      data: createData,
      include: {
        specialCategory: true,
        normalCategories: { include: { category: true } },
        clubSlots: true,
      },
    });
    return NextResponse.json(game);
  } catch (e) {
    console.error('POST /api/admin/pre-sale-games', e);
    const message = e instanceof Error ? e.message : 'Erro ao criar jogo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
