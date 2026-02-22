import { NextResponse } from 'next/server';
import { getApprovedPartner } from '@/lib/partnerAuth';
import { prisma } from '@/lib/db';

/**
 * Resumo e lista de ganhos do parceiro.
 * Apenas valores líquidos (comissão), nunca faturamento total.
 */
export async function GET() {
  const partner = await getApprovedPartner();
  if (!partner) {
    return NextResponse.json({ error: 'Acesso apenas para parceiros aprovados' }, { status: 403 });
  }

  const earnings = await prisma.partnerEarning.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      sourceType: true,
      amountCents: true,
      commissionPercent: true,
      status: true,
      createdAt: true,
      paidAt: true,
    },
  });

  let totalPendenteCents = 0;
  let totalPagoCents = 0;
  for (const e of earnings) {
    if (e.status === 'pending') totalPendenteCents += e.amountCents;
    else totalPagoCents += e.amountCents;
  }

  const itens = earnings.map((e) => ({
    id: e.id,
    type: e.sourceType === 'purchase' ? 'plano' : 'patrocínio',
    commissionCents: e.amountCents,
    commissionPercent: e.commissionPercent,
    status: e.status,
    date: e.createdAt.toISOString(),
    paidAt: e.paidAt?.toISOString() ?? null,
  }));

  return NextResponse.json({
    totalPendenteCents,
    totalPagoCents,
    itens,
  });
}
