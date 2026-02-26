import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/** Lista saques de times para o admin. */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const [total, withdrawals] = await Promise.all([
    prisma.teamWithdrawal.count(),
    prisma.teamWithdrawal.findMany({
      orderBy: { requestedAt: 'desc' },
      skip,
      take: limit,
      include: {
        team: { select: { name: true } },
      },
    }),
  ]);

  const items = withdrawals.map((w) => ({
      id: w.id,
      teamId: w.teamId,
      teamName: w.team.name,
      amountCents: w.amountCents,
      status: w.status,
      requestedAt: w.requestedAt.toISOString(),
      paidAt: w.paidAt?.toISOString() ?? null,
      paymentReference: w.paymentReference,
      receiptUrl: w.receiptUrl,
      pixKey: w.pixKey ?? null,
      pixKeyType: w.pixKeyType ?? null,
      pixName: w.pixName ?? null,
    }));

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  });
}

