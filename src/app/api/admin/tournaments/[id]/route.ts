import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { uniqueSlug } from '@/lib/slug';

const REGISTRATION_MODES = ['FREE', 'PAID', 'GOAL'] as const;
const STATUSES = ['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'FINISHED'] as const;

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  season: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  maxTeams: z.number().int().min(1).max(32).optional(),
  registrationMode: z.enum(REGISTRATION_MODES).optional(),
  registrationFeeAmount: z.number().min(0).optional().nullable(),
  goalRequiredSupporters: z.number().int().min(0).optional().nullable(),
  goalPricePerSupporter: z.number().min(0).optional().nullable(),
  goalStartAt: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || v.trim() === '' || !isNaN(Date.parse(v)), { message: 'Invalid datetime' }),
  goalEndAt: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v || v.trim() === '' || !isNaN(Date.parse(v)), { message: 'Invalid datetime' }),
  lockConfirmationOnGoal: z.boolean().optional(),
  status: z.enum(STATUSES).optional(),
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
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { _count: { select: { teams: true, matches: true } } },
  });
  if (!tournament) return NextResponse.json({ error: 'Torneio não encontrado' }, { status: 404 });
  return NextResponse.json(tournament);
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
  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Torneio não encontrado' }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse({
      ...body,
      maxTeams: body.maxTeams != null ? Number(body.maxTeams) : undefined,
      registrationFeeAmount: body.registrationFeeAmount != null ? Number(body.registrationFeeAmount) : undefined,
      goalRequiredSupporters: body.goalRequiredSupporters != null ? Number(body.goalRequiredSupporters) : undefined,
      goalPricePerSupporter: body.goalPricePerSupporter != null ? Number(body.goalPricePerSupporter) : undefined,
      goalStartAt: body.goalStartAt ?? undefined,
      goalEndAt: body.goalEndAt ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.slug !== undefined) {
      const existingSlugs = (await prisma.tournament.findMany({ where: { id: { not: id } }, select: { slug: true } })).map((t) => t.slug);
      update.slug = existingSlugs.includes(data.slug) ? uniqueSlug(data.slug, existingSlugs) : data.slug;
    }
    if (data.season !== undefined) update.season = data.season;
    if (data.region !== undefined) update.region = data.region;
    if (data.maxTeams !== undefined) update.maxTeams = data.maxTeams;
    if (data.registrationMode !== undefined) update.registrationMode = data.registrationMode;
    const effectiveMode = data.registrationMode ?? existing.registrationMode;
    if (data.registrationFeeAmount !== undefined) update.registrationFeeAmount = effectiveMode === 'PAID' ? data.registrationFeeAmount : null;
    if (data.registrationMode === 'GOAL') {
      if (data.goalRequiredSupporters !== undefined) update.goalRequiredSupporters = data.goalRequiredSupporters;
      if (data.goalPricePerSupporter !== undefined) update.goalPricePerSupporter = data.goalPricePerSupporter;
      if (data.goalStartAt !== undefined) update.goalStartAt = data.goalStartAt ? new Date(data.goalStartAt) : null;
      if (data.goalEndAt !== undefined) update.goalEndAt = data.goalEndAt ? new Date(data.goalEndAt) : null;
    }
    if (data.lockConfirmationOnGoal !== undefined) update.lockConfirmationOnGoal = data.lockConfirmationOnGoal;
    if (data.status !== undefined) update.status = data.status;

    const tournament = await prisma.tournament.update({
      where: { id },
      data: update as Parameters<typeof prisma.tournament.update>[0]['data'],
    });
    return NextResponse.json(tournament);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao atualizar torneio' }, { status: 500 });
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
  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) return NextResponse.json({ error: 'Torneio não encontrado' }, { status: 404 });

  await prisma.tournament.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
