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
  // Premiação (todos opcionais)
  premiacaoTipo: z.string().optional().nullable(),
  premioPrimeiro: z.number().min(0).optional().nullable(),
  premioSegundo: z.number().min(0).optional().nullable(),
  premioTerceiro: z.number().min(0).optional().nullable(),
  premioQuarto: z.number().min(0).optional().nullable(),
  trofeuCampeao: z.boolean().optional(),
  trofeuVice: z.boolean().optional(),
  trofeuTerceiro: z.boolean().optional(),
  trofeuQuarto: z.boolean().optional(),
  trofeuArtilheiro: z.boolean().optional(),
  craqueDaCopa: z.boolean().optional(),
  regulamentoUrl: z.string().optional().nullable(),
  regulamentoTexto: z.string().optional().nullable(),
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
      premiacaoTipo: body.premiacaoTipo ?? null,
      premioPrimeiro: body.premioPrimeiro != null ? Number(body.premioPrimeiro) : null,
      premioSegundo: body.premioSegundo != null ? Number(body.premioSegundo) : null,
      premioTerceiro: body.premioTerceiro != null ? Number(body.premioTerceiro) : null,
      premioQuarto: body.premioQuarto != null ? Number(body.premioQuarto) : null,
      trofeuCampeao: body.trofeuCampeao ?? false,
      trofeuVice: body.trofeuVice ?? false,
      trofeuTerceiro: body.trofeuTerceiro ?? false,
      trofeuQuarto: body.trofeuQuarto ?? false,
      trofeuArtilheiro: body.trofeuArtilheiro ?? false,
      craqueDaCopa: body.craqueDaCopa ?? false,
      regulamentoUrl: body.regulamentoUrl && body.regulamentoUrl.trim() ? body.regulamentoUrl.trim() : null,
      regulamentoTexto: body.regulamentoTexto && body.regulamentoTexto.trim() ? body.regulamentoTexto.trim() : null,
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
        premiacaoTipo: data.premiacaoTipo ?? null,
        premioPrimeiro: data.premioPrimeiro ?? null,
        premioSegundo: data.premioSegundo ?? null,
        premioTerceiro: data.premioTerceiro ?? null,
        premioQuarto: data.premioQuarto ?? null,
        trofeuCampeao: data.trofeuCampeao ?? false,
        trofeuVice: data.trofeuVice ?? false,
        trofeuTerceiro: data.trofeuTerceiro ?? false,
        trofeuQuarto: data.trofeuQuarto ?? false,
        trofeuArtilheiro: data.trofeuArtilheiro ?? false,
        craqueDaCopa: data.craqueDaCopa ?? false,
        regulamentoUrl: data.regulamentoUrl != null && data.regulamentoUrl !== '' ? data.regulamentoUrl : null,
        regulamentoTexto: data.regulamentoTexto != null && data.regulamentoTexto !== '' ? data.regulamentoTexto : null,
      },
    });
    return NextResponse.json(tournament);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao criar torneio' }, { status: 500 });
  }
}
