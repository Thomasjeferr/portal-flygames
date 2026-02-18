import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const onlyMissingTeam = searchParams.get('missingTeam') === 'true';

  const where: Record<string, unknown> = {};
  where.paymentStatus = 'paid';
  if (onlyMissingTeam) {
    where.OR = [
      { teamId: null },
      { amountToTeamCents: 0 },
    ];
  }

  const orders = await prisma.sponsorOrder.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      sponsorPlan: {
        select: { name: true, price: true, teamPayoutPercent: true },
      },
      team: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(orders);
}

