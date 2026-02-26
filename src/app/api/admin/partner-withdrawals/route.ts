import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** Lista saques de parceiros para o admin. */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const withdrawals = await prisma.partnerWithdrawal.findMany({
    orderBy: { requestedAt: 'desc' },
    include: {
      partner: { select: { name: true, companyName: true, refCode: true } },
    },
  });

  return NextResponse.json(
    withdrawals.map((w) => ({
      id: w.id,
      partnerId: w.partnerId,
      partnerName: w.partner.name,
      partnerCompanyName: w.partner.companyName,
      partnerRefCode: w.partner.refCode,
      amountCents: w.amountCents,
      status: w.status,
      requestedAt: w.requestedAt.toISOString(),
      paidAt: w.paidAt?.toISOString() ?? null,
      paymentReference: w.paymentReference,
      receiptUrl: w.receiptUrl,
      pixKey: w.pixKey ?? null,
      pixKeyType: w.pixKeyType ?? null,
      pixName: w.pixName ?? null,
    }))
  );
}

