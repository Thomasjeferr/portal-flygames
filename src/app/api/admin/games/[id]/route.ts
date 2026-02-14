import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { uniqueSlug } from '@/lib/slug';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  championship: z.string().min(1).optional(),
  gameDate: z.string().optional(),
  description: z.string().optional(),
  videoUrl: z.string().url().optional(),
  thumbnailUrl: z.string().optional(),
  featured: z.boolean().optional(),
  categoryId: z.string().optional().nullable(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const game = await prisma.game.findUnique({ where: { id: (await params).id }, include: { category: true } });
  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });
  return NextResponse.json(game);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const id = (await params).id;
  const existing = await prisma.game.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const update: Record<string, unknown> = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.championship !== undefined) update.championship = data.championship;
    if (data.gameDate !== undefined) update.gameDate = new Date(data.gameDate);
    if (data.description !== undefined) update.description = data.description;
    if (data.videoUrl !== undefined) update.videoUrl = data.videoUrl;
    if (data.thumbnailUrl !== undefined) update.thumbnailUrl = data.thumbnailUrl === '' ? null : data.thumbnailUrl;
    if (data.featured !== undefined) update.featured = data.featured;
    if (data.categoryId !== undefined) update.categoryId = data.categoryId || null;
    if (data.title && data.title !== existing.title) {
      const existingSlugs = (await prisma.game.findMany({ where: { id: { not: id } }, select: { slug: true } })).map((g) => g.slug);
      update.slug = uniqueSlug(data.title, existingSlugs);
    }

    const game = await prisma.game.update({
      where: { id },
      data: update as Parameters<typeof prisma.game.update>[0]['data'],
    });
    return NextResponse.json(game);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao atualizar jogo' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const id = (await params).id;
  await prisma.game.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
