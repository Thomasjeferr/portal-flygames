import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const onlyMissingTeam = searchParams.get('missingTeam') === 'true';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  where.paymentStatus = 'paid';
  if (onlyMissingTeam) {
    where.OR = [
      { teamId: null },
      { amountToTeamCents: 0 },
    ];
  }

  const [total, orders] = await Promise.all([
    prisma.sponsorOrder.count({ where }),
    prisma.sponsorOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        sponsorPlan: {
          select: { name: true, price: true, teamPayoutPercent: true },
        },
        team: { select: { id: true, name: true } },
      },
    }),
  ]);

  return NextResponse.json({
    orders,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  });
}

