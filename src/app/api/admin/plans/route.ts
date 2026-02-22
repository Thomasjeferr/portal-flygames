import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  type: z.enum(['unitario', 'recorrente']),
  periodicity: z.enum(['mensal', 'anual', 'personalizado']),
  price: z.number().min(0),
  description: z.string().optional(),
  active: z.boolean().optional(),
  acessoTotal: z.boolean().optional(),
  duracaoDias: z.number().int().min(0).nullable().optional(),
  renovacaoAuto: z.boolean().optional(),
  teamPayoutPercent: z.number().int().min(0).max(100).optional(),
  partnerCommissionPercent: z.number().int().min(0).max(100).optional(),
  maxConcurrentStreams: z.number().int().min(1).nullable().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';
  const where = activeOnly ? { active: true } : {};

  const plans = await prisma.plan.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(plans);
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
      price: Number(body.price),
      active: body.active ?? true,
      acessoTotal: body.acessoTotal ?? true,
      duracaoDias: body.duracaoDias != null ? Number(body.duracaoDias) : null,
      renovacaoAuto: body.renovacaoAuto ?? false,
      teamPayoutPercent: body.teamPayoutPercent != null ? Number(body.teamPayoutPercent) : 0,
      partnerCommissionPercent: body.partnerCommissionPercent != null ? Number(body.partnerCommissionPercent) : 0,
      maxConcurrentStreams: body.maxConcurrentStreams != null ? Number(body.maxConcurrentStreams) : null,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const plan = await prisma.plan.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        periodicity: parsed.data.periodicity,
        price: parsed.data.price,
        description: parsed.data.description ?? null,
        active: parsed.data.active ?? true,
        acessoTotal: parsed.data.acessoTotal ?? true,
        duracaoDias: parsed.data.duracaoDias ?? null,
        renovacaoAuto: parsed.data.renovacaoAuto ?? false,
        teamPayoutPercent: parsed.data.teamPayoutPercent ?? 0,
        partnerCommissionPercent: parsed.data.partnerCommissionPercent ?? 0,
        maxConcurrentStreams: parsed.data.maxConcurrentStreams ?? null,
      },
    });
    return NextResponse.json(plan);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao criar plano' }, { status: 500 });
  }
}
