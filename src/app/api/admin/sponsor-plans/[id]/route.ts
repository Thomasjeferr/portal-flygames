import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sponsorPlanUpdateSchema } from '@/lib/validators/sponsorPlanSchema';

function toResponse(p: { benefits: unknown; featuresFlags: unknown } & Record<string, unknown>) {
  return {
    ...p,
    benefits: typeof p.benefits === 'string' ? JSON.parse(p.benefits || '[]') : p.benefits,
    featuresFlags: typeof p.featuresFlags === 'string' ? JSON.parse(p.featuresFlags || '{}') : p.featuresFlags,
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const id = (await params).id;
  const plan = await prisma.sponsorPlan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });
  return NextResponse.json(toResponse(plan));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const id = (await params).id;
  try {
    const current = await prisma.sponsorPlan.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

    const raw = await request.json();
    const parsed = sponsorPlanUpdateSchema.safeParse({
      ...raw,
      price: raw.price !== undefined ? (typeof raw.price === 'number' ? raw.price : Number(raw.price)) : undefined,
      sortOrder: raw.sortOrder !== undefined ? (typeof raw.sortOrder === 'number' ? raw.sortOrder : Number(raw.sortOrder)) : undefined,
      teamPayoutPercent: raw.teamPayoutPercent !== undefined ? (typeof raw.teamPayoutPercent === 'number' ? raw.teamPayoutPercent : Number(raw.teamPayoutPercent)) : undefined,
      partnerCommissionPercent: raw.partnerCommissionPercent !== undefined ? (typeof raw.partnerCommissionPercent === 'number' ? raw.partnerCommissionPercent : Number(raw.partnerCommissionPercent)) : undefined,
    });
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 });
    const d = parsed.data;

    const update: Record<string, unknown> = {};
    if (d.name !== undefined) update.name = d.name;
    if (d.price !== undefined) update.price = d.price;
    if (d.billingPeriod !== undefined) update.billingPeriod = d.billingPeriod;
    if (d.benefits !== undefined) update.benefits = JSON.stringify(Array.isArray(d.benefits) ? d.benefits : []);
    if (d.featuresFlags !== undefined) update.featuresFlags = JSON.stringify(typeof d.featuresFlags === 'object' ? d.featuresFlags : {});
    if (d.teamPayoutPercent !== undefined) update.teamPayoutPercent = d.teamPayoutPercent;
    if (d.partnerCommissionPercent !== undefined) update.partnerCommissionPercent = d.partnerCommissionPercent;
    if (d.sortOrder !== undefined) update.sortOrder = d.sortOrder;
    if (d.isActive !== undefined) update.isActive = d.isActive;

    const plan = await prisma.sponsorPlan.update({
      where: { id },
      data: update as Parameters<typeof prisma.sponsorPlan.update>[0]['data'],
    });
    revalidatePath('/');
    return NextResponse.json(toResponse(plan));
  } catch (e) {
    console.error('PATCH /api/admin/sponsor-plans/[id]', e);
    return NextResponse.json({ error: 'Erro ao atualizar plano' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const id = (await params).id;
  try {
    await prisma.sponsorPlan.delete({ where: { id } });
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/admin/sponsor-plans/[id]', e);
    return NextResponse.json({ error: 'Erro ao excluir plano' }, { status: 500 });
  }
}
