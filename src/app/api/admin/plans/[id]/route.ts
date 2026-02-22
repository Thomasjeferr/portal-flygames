import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['unitario', 'recorrente']).optional(),
  periodicity: z.enum(['mensal', 'anual', 'personalizado']).optional(),
  price: z.number().min(0).optional(),
  description: z.string().nullable().optional(),
  active: z.boolean().optional(),
  acessoTotal: z.boolean().optional(),
  duracaoDias: z.number().int().min(0).nullable().optional(),
  renovacaoAuto: z.boolean().optional(),
  teamPayoutPercent: z.number().int().min(0).max(100).optional(),
  partnerCommissionPercent: z.number().int().min(0).max(100).optional(),
  maxConcurrentStreams: z.number().int().min(1).nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id;
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });
  return NextResponse.json(plan);
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
  const existing = await prisma.plan.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse({
      ...body,
      price: body.price != null ? Number(body.price) : undefined,
      duracaoDias: body.duracaoDias != null ? Number(body.duracaoDias) : undefined,
      teamPayoutPercent: body.teamPayoutPercent != null ? Number(body.teamPayoutPercent) : undefined,
      partnerCommissionPercent: body.partnerCommissionPercent != null ? Number(body.partnerCommissionPercent) : undefined,
      maxConcurrentStreams: body.maxConcurrentStreams != null ? Number(body.maxConcurrentStreams) : undefined,
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
    if (data.type !== undefined) update.type = data.type;
    if (data.periodicity !== undefined) update.periodicity = data.periodicity;
    if (data.price !== undefined) update.price = data.price;
    if (data.description !== undefined) update.description = data.description;
    if (data.active !== undefined) update.active = data.active;
    if (data.acessoTotal !== undefined) update.acessoTotal = data.acessoTotal;
    if (data.duracaoDias !== undefined) update.duracaoDias = data.duracaoDias;
    if (data.renovacaoAuto !== undefined) update.renovacaoAuto = data.renovacaoAuto;
    if (data.teamPayoutPercent !== undefined) update.teamPayoutPercent = data.teamPayoutPercent;
    if (data.partnerCommissionPercent !== undefined) update.partnerCommissionPercent = data.partnerCommissionPercent;
    if (data.maxConcurrentStreams !== undefined) update.maxConcurrentStreams = data.maxConcurrentStreams;

    const plan = await prisma.plan.update({
      where: { id },
      data: update as Parameters<typeof prisma.plan.update>[0]['data'],
    });
    return NextResponse.json(plan);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao atualizar plano' }, { status: 500 });
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
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

  const withPurchases = await prisma.purchase.count({ where: { planId: id } });
  const withSubs = await prisma.subscription.count({ where: { planId: id } });
  if (withPurchases > 0 || withSubs > 0) {
    return NextResponse.json(
      { error: 'Não é possível excluir plano com compras ou assinaturas vinculadas. Desative-o.' },
      { status: 400 }
    );
  }

  await prisma.plan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
