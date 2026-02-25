import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** Lista saques de times para o admin. */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const withdrawals = await prisma.teamWithdrawal.findMany({
    orderBy: { requestedAt: 'desc' },
    include: {
      team: { select: { name: true } },
    },
  });

  return NextResponse.json(
    withdrawals.map((w) => ({
      id: w.id,
      teamId: w.teamId,
      teamName: w.team.name,
      amountCents: w.amountCents,
      status: w.status,
      requestedAt: w.requestedAt.toISOString(),
      paidAt: w.paidAt?.toISOString() ?? null,
      paymentReference: w.paymentReference,
      receiptUrl: w.receiptUrl,
    }))
  );
}

