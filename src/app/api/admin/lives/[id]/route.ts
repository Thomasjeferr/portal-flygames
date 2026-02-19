import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  cloudflarePlaybackId: z.string().optional().nullable(),
  status: z.enum(['SCHEDULED', 'LIVE', 'ENDED']).optional(),
  startAt: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !Number.isNaN(Date.parse(val)), { message: 'Data/hora de início inválida' }),
  endAt: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !Number.isNaN(Date.parse(val)), { message: 'Data/hora de fim inválida' }),
  requireSubscription: z.boolean().optional(),
  allowOneTimePurchase: z.boolean().optional(),
  allowChat: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const id = (await params).id;
  const live = await prisma.live.findUnique({ where: { id } });
  if (!live) return NextResponse.json({ error: 'Live não encontrada' }, { status: 404 });
  return NextResponse.json(live);
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
  const existing = await prisma.live.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Live não encontrada' }, { status: 404 });

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
    if (data.description !== undefined) update.description = data.description;
    if (data.thumbnailUrl !== undefined) update.thumbnailUrl = data.thumbnailUrl || null;

    if (data.cloudflarePlaybackId !== undefined) {
      update.cloudflarePlaybackId = data.cloudflarePlaybackId || null;
    }

    if (data.status !== undefined) update.status = data.status;

    // Se tem ID de replay preenchido, live é considerada encerrada (não mostrar como "ao vivo").
    const finalPlaybackId = data.cloudflarePlaybackId !== undefined ? (data.cloudflarePlaybackId || null) : existing.cloudflarePlaybackId;
    if (finalPlaybackId) {
      update.status = 'ENDED';
    }
    if (data.startAt !== undefined) update.startAt = data.startAt ? new Date(data.startAt) : null;
    if (data.endAt !== undefined) update.endAt = data.endAt ? new Date(data.endAt) : null;
    if (data.requireSubscription !== undefined) update.requireSubscription = data.requireSubscription;
    if (data.allowOneTimePurchase !== undefined) update.allowOneTimePurchase = data.allowOneTimePurchase;
    if (data.allowChat !== undefined) update.allowChat = data.allowChat;

    const live = await prisma.live.update({
      where: { id },
      data: update as Parameters<typeof prisma.live.update>[0]['data'],
    });
    return NextResponse.json(live);
  } catch (e) {
    console.error('PATCH /api/admin/lives/[id]', e);
    return NextResponse.json({ error: 'Erro ao atualizar live' }, { status: 500 });
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
  await prisma.live.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
