import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  description: z.string().optional().nullable(),
  videoUrl: z.string().min(1, 'URL do vídeo obrigatória'),
  thumbnailUrl: z.string().optional().nullable(),
  durationSec: z.number().int().min(0).optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const gameId = (await params).id;
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });

  const highlights = await prisma.gameHighlight.findMany({
    where: { gameId },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({ highlights });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const gameId = (await params).id;
  const game = await prisma.game.findUnique({ where: { id: gameId } });
  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const maxOrder = await prisma.gameHighlight
      .aggregate({ where: { gameId }, _max: { order: true } })
      .then((r) => r._max.order ?? -1);

    const highlight = await prisma.gameHighlight.create({
      data: {
        gameId,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        videoUrl: data.videoUrl.trim(),
        thumbnailUrl: data.thumbnailUrl?.trim() || null,
        durationSec: data.durationSec ?? null,
        order: data.order ?? maxOrder + 1,
      },
    });
    return NextResponse.json(highlight);
  } catch (e) {
    console.error('POST /api/admin/games/[id]/highlights', e);
    return NextResponse.json({ error: 'Erro ao criar corte' }, { status: 500 });
  }
}
