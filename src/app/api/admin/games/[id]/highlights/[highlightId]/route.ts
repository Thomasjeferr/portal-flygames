import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  videoUrl: z.string().min(1).optional(),
  thumbnailUrl: z.string().optional().nullable(),
  durationSec: z.number().int().min(0).optional().nullable(),
  order: z.number().int().min(0).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; highlightId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const { id: gameId, highlightId } = await params;
  const existing = await prisma.gameHighlight.findFirst({
    where: { id: highlightId, gameId },
  });
  if (!existing) return NextResponse.json({ error: 'Corte não encontrado' }, { status: 404 });

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
    if (data.title !== undefined) update.title = data.title.trim();
    if (data.description !== undefined) update.description = data.description?.trim() || null;
    if (data.videoUrl !== undefined) update.videoUrl = data.videoUrl.trim();
    if (data.thumbnailUrl !== undefined) update.thumbnailUrl = data.thumbnailUrl?.trim() || null;
    if (data.durationSec !== undefined) update.durationSec = data.durationSec;
    if (data.order !== undefined) update.order = data.order;

    const highlight = await prisma.gameHighlight.update({
      where: { id: highlightId },
      data: update as Parameters<typeof prisma.gameHighlight.update>[0]['data'],
    });
    return NextResponse.json(highlight);
  } catch (e) {
    console.error('PATCH /api/admin/games/[id]/highlights/[highlightId]', e);
    return NextResponse.json({ error: 'Erro ao atualizar corte' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; highlightId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const { id: gameId, highlightId } = await params;
  const existing = await prisma.gameHighlight.findFirst({
    where: { id: highlightId, gameId },
  });
  if (!existing) return NextResponse.json({ error: 'Corte não encontrado' }, { status: 404 });

  await prisma.gameHighlight.delete({ where: { id: highlightId } });
  return NextResponse.json({ ok: true });
}
