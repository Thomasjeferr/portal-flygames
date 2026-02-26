import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { uniqueSlug } from '@/lib/slug';

const createSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  championship: z.string().min(1, 'Campeonato obrigatório'),
  gameDate: z.string().min(10, 'Data inválida'),
  description: z.string().optional(),
  videoUrl: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        val.trim() === '' ||
        (val.startsWith('stream:') && val.length > 7) ||
        z.string().url().safeParse(val).success,
      'URL do vídeo inválida. Use YouTube, Vimeo, PandaVideo ou stream:VIDEO_ID'
    ),
  thumbnailUrl: z.string().optional(),
  featured: z.boolean().optional(),
  categoryId: z.string().optional().nullable(),
  homeTeamId: z.string().optional().nullable(),
  awayTeamId: z.string().optional().nullable(),
  displayMode: z.enum(['internal', 'public_no_media', 'public_with_media']).optional(),
  homeScore: z.number().int().min(0).optional().nullable(),
  awayScore: z.number().int().min(0).optional().nullable(),
  venue: z.string().optional().nullable(),
  referee: z.string().optional().nullable(),
});

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const categoryParam = searchParams.get('categoryId')?.trim();
  const skip = (page - 1) * limit;
  const where =
    categoryParam === '__none__' || categoryParam === 'none'
      ? { categoryId: null }
      : categoryParam
        ? { categoryId: categoryParam }
        : undefined;

  const [total, games] = await Promise.all([
    prisma.game.count({ where }),
    prisma.game.findMany({
      where,
      orderBy: [{ order: 'asc' }, { gameDate: 'desc' }],
      skip,
      take: limit,
      include: {
        category: { select: { id: true, name: true } },
        homeTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
        awayTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
      },
    }),
  ]);
  return NextResponse.json({
    games,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse({
      ...body,
      gameDate: body.gameDate ?? new Date().toISOString(),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const existingSlugs = (await prisma.game.findMany({ select: { slug: true } })).map((g) => g.slug);
    const slug = uniqueSlug(data.title, existingSlugs);

    const maxOrder = await prisma.game.aggregate({ _max: { order: true } }).then((r) => r._max.order ?? -1);

    const game = await prisma.game.create({
      data: {
        title: data.title,
        slug,
        championship: data.championship,
        gameDate: new Date(data.gameDate),
        description: data.description || null,
        videoUrl: data.videoUrl?.trim() || null,
        thumbnailUrl: data.thumbnailUrl || null,
        featured: data.featured ?? false,
        categoryId: data.categoryId || null,
        homeTeamId: data.homeTeamId || null,
        awayTeamId: data.awayTeamId || null,
        order: maxOrder + 1,
        displayMode: data.displayMode ?? 'internal',
        homeScore: data.homeScore ?? null,
        awayScore: data.awayScore ?? null,
        venue: data.venue?.trim() || null,
        referee: data.referee?.trim() || null,
      },
    });

    return NextResponse.json(game);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao cadastrar jogo' }, { status: 500 });
  }
}
