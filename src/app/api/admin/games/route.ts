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
  videoUrl: z.string().url('URL do vídeo inválida'),
  thumbnailUrl: z.string().optional(),
  featured: z.boolean().optional(),
  categoryId: z.string().optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const games = await prisma.game.findMany({
    orderBy: [{ order: 'asc' }, { gameDate: 'desc' }],
  });
  return NextResponse.json(games);
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
        videoUrl: data.videoUrl,
        thumbnailUrl: data.thumbnailUrl || null,
        featured: data.featured ?? false,
        categoryId: data.categoryId || null,
        order: maxOrder + 1,
      },
    });

    return NextResponse.json(game);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao cadastrar jogo' }, { status: 500 });
  }
}
