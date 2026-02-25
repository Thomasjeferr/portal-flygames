import { NextResponse } from 'next/server';
import { getApprovedPartner } from '@/lib/partnerAuth';
import { prisma } from '@/lib/db';
import { getAvailableAt } from '@/lib/payoutRules';

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
      sourceId: true,
      sourceType: true,
      amountCents: true,
      commissionPercent: true,
      status: true,
      createdAt: true,
      paidAt: true,
    },
  });

  const purchaseIds = earnings.filter((e) => e.sourceType === 'purchase').map((e) => e.sourceId);
  const sponsorOrderIds = earnings.filter((e) => e.sourceType === 'sponsor').map((e) => e.sourceId);

  const [purchases, sponsorOrders] = await Promise.all([
    purchaseIds.length
      ? prisma.purchase.findMany({
          where: { id: { in: purchaseIds } },
          select: { id: true, createdAt: true, paymentGateway: true },
        })
      : Promise.resolve([]),
    sponsorOrderIds.length
      ? prisma.sponsorOrder.findMany({
          where: { id: { in: sponsorOrderIds } },
          select: { id: true, createdAt: true, paymentGateway: true },
        })
      : Promise.resolve([]),
  ]);

  const purchaseMap = new Map(purchases.map((p) => [p.id, p]));
  const sponsorOrderMap = new Map(sponsorOrders.map((s) => [s.id, s]));

  const now = new Date();
  let totalPendenteCents = 0;
  let totalLiberadoCents = 0;
  let totalPagoCents = 0;

  const itens = earnings.map((e) => {
    let createdAt = e.createdAt;
    let gateway: string | null | undefined = null;

    if (e.sourceType === 'purchase') {
      const p = purchaseMap.get(e.sourceId);
      if (p) {
        createdAt = p.createdAt;
        gateway = p.paymentGateway;
      }
    } else if (e.sourceType === 'sponsor') {
      const s = sponsorOrderMap.get(e.sourceId);
      if (s) {
        createdAt = s.createdAt;
        gateway = s.paymentGateway;
      }
    }

    const availableAt = getAvailableAt(createdAt, gateway);

    if (e.status === 'paid') {
      totalPagoCents += e.amountCents;
    } else {
      totalPendenteCents += e.amountCents;
      if (availableAt <= now) {
        totalLiberadoCents += e.amountCents;
      }
    }

    return {
      id: e.id,
      type: e.sourceType === 'purchase' ? 'plano' : 'patrocínio',
      commissionCents: e.amountCents,
      commissionPercent: e.commissionPercent,
      status: e.status,
      date: e.createdAt.toISOString(),
      paidAt: e.paidAt?.toISOString() ?? null,
      availableAt: availableAt.toISOString(),
    };
  });

  return NextResponse.json({
    totalPendenteCents,
    totalLiberadoCents,
    totalPagoCents,
    itens,
  });
}
