import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sponsorPlanCreateSchema } from '@/lib/validators/sponsorPlanSchema';

function toResponse(p: { benefits: unknown; featuresFlags: unknown } & Record<string, unknown>) {
  return {
    ...p,
    benefits: typeof p.benefits === 'string' ? JSON.parse(p.benefits || '[]') : p.benefits,
    featuresFlags: typeof p.featuresFlags === 'string' ? JSON.parse(p.featuresFlags || '{}') : p.featuresFlags,
  };
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const [total, rawPlans] = await Promise.all([
    prisma.sponsorPlan.count(),
    prisma.sponsorPlan.findMany({
      orderBy: { sortOrder: 'asc' },
      skip,
      take: limit,
    }),
  ]);
  const plans = rawPlans.map(toResponse);

  return NextResponse.json({
    plans,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  try {
    const raw = await request.json();
    const parsed = sponsorPlanCreateSchema.safeParse({
      name: raw.name,
      price: typeof raw.price === 'number' ? raw.price : Number(raw.price) ?? 0,
      billingPeriod: raw.billingPeriod ?? 'monthly',
      benefits: Array.isArray(raw.benefits) ? raw.benefits : [],
      featuresFlags: raw.featuresFlags && typeof raw.featuresFlags === 'object' ? raw.featuresFlags : {},
      teamPayoutPercent: typeof raw.teamPayoutPercent === 'number' ? raw.teamPayoutPercent : Number(raw.teamPayoutPercent) ?? 0,
      partnerCommissionPercent: typeof raw.partnerCommissionPercent === 'number' ? raw.partnerCommissionPercent : Number(raw.partnerCommissionPercent) ?? 0,
      sortOrder: typeof raw.sortOrder === 'number' ? raw.sortOrder : Number(raw.sortOrder) ?? 0,
      isActive: raw.isActive ?? true,
    });
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 });
    const d = parsed.data;
    const plan = await prisma.sponsorPlan.create({
      data: {
        name: d.name,
        price: d.price,
        billingPeriod: d.billingPeriod,
        benefits: JSON.stringify(Array.isArray(d.benefits) ? d.benefits : []),
        featuresFlags: JSON.stringify(typeof d.featuresFlags === 'object' ? d.featuresFlags : {}),
        teamPayoutPercent: d.teamPayoutPercent,
        partnerCommissionPercent: d.partnerCommissionPercent,
        sortOrder: d.sortOrder,
        isActive: d.isActive,
      },
    });
    revalidatePath('/');
    return NextResponse.json(toResponse(plan));
  } catch (e) {
    console.error('POST /api/admin/sponsor-plans', e);
    return NextResponse.json({ error: 'Erro ao criar plano' }, { status: 500 });
  }
}
