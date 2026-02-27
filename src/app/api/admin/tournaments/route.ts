import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { uniqueSlug } from '@/lib/slug';

const REGISTRATION_MODES = ['FREE', 'PAID', 'GOAL'] as const;
const STATUSES = ['DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'FINISHED'] as const;

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  slug: z.string().min(1, 'Slug obrigatório').regex(/^[a-z0-9-]+$/, 'Slug: apenas letras minúsculas, números e hífen'),
  season: z.string().optional(),
  region: z.string().optional(),
  maxTeams: z.number().int().min(1).max(32),
  registrationMode: z.enum(REGISTRATION_MODES),
  registrationFeeAmount: z.number().min(0).optional().nullable(),
  goalRequiredSupporters: z.number().int().min(0).optional().nullable(),
  goalPricePerSupporter: z.number().min(0).optional().nullable(),
  goalStartAt: z.string().datetime().optional().nullable(),
  goalEndAt: z.string().datetime().optional().nullable(),
  lockConfirmationOnGoal: z.boolean().optional(),
  status: z.enum(STATUSES).optional(),
});

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');
  const where = statusFilter ? { status: statusFilter } : {};
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const [total, tournaments] = await Promise.all([
    prisma.tournament.count({ where }),
    prisma.tournament.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: { select: { teams: true } },
      },
    }),
  ]);

  return NextResponse.json({
    tournaments,
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
      maxTeams: body.maxTeams != null ? Number(body.maxTeams) : 16,
      registrationFeeAmount: body.registrationFeeAmount != null ? Number(body.registrationFeeAmount) : null,
      goalRequiredSupporters: body.goalRequiredSupporters != null ? Number(body.goalRequiredSupporters) : null,
      goalPricePerSupporter: body.goalPricePerSupporter != null ? Number(body.goalPricePerSupporter) : null,
      goalStartAt: body.goalStartAt || null,
      goalEndAt: body.goalEndAt || null,
      lockConfirmationOnGoal: body.lockConfirmationOnGoal ?? true,
      status: body.status ?? 'DRAFT',
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const existingSlugs = (await prisma.tournament.findMany({ select: { slug: true } })).map((t) => t.slug);
    const slug = data.slug ? (existingSlugs.includes(data.slug) ? uniqueSlug(data.slug, existingSlugs) : data.slug) : uniqueSlug(data.name, existingSlugs);

    const tournament = await prisma.tournament.create({
      data: {
        name: data.name,
        slug,
        season: data.season ?? null,
        region: data.region ?? null,
        maxTeams: data.maxTeams,
        registrationMode: data.registrationMode,
        registrationFeeAmount: data.registrationMode === 'PAID' ? (data.registrationFeeAmount ?? 0) : null,
        goalRequiredSupporters: data.registrationMode === 'GOAL' ? data.goalRequiredSupporters ?? null : null,
        goalPricePerSupporter: data.registrationMode === 'GOAL' ? data.goalPricePerSupporter ?? null : null,
        goalStartAt: data.registrationMode === 'GOAL' ? (data.goalStartAt ? new Date(data.goalStartAt) : null) : null,
        goalEndAt: data.registrationMode === 'GOAL' ? (data.goalEndAt ? new Date(data.goalEndAt) : null) : null,
        lockConfirmationOnGoal: data.lockConfirmationOnGoal ?? true,
        status: data.status ?? 'DRAFT',
      },
    });
    return NextResponse.json(tournament);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao criar torneio' }, { status: 500 });
  }
}
