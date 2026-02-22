import { NextResponse } from 'next/server';
import { getApprovedPartner } from '@/lib/partnerAuth';
import { prisma } from '@/lib/db';

/**
 * Lista indicações do parceiro.
 * Exibe apenas valor líquido (comissão do parceiro), nunca faturamento total.
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
      sourceId: true,
      amountCents: true,
      commissionPercent: true,
      status: true,
      createdAt: true,
    },
  });

  const purchaseIds = earnings.filter((e) => e.sourceType === 'purchase').map((e) => e.sourceId);
  const sponsorIds = earnings.filter((e) => e.sourceType === 'sponsor').map((e) => e.sourceId);

  const [purchases, sponsorOrders] = await Promise.all([
    purchaseIds.length > 0
      ? prisma.purchase.findMany({
          where: { id: { in: purchaseIds } },
          select: {
            id: true,
            user: { select: { name: true, email: true } },
            createdAt: true,
          },
        })
      : [],
    sponsorIds.length > 0
      ? prisma.sponsorOrder.findMany({
          where: { id: { in: sponsorIds } },
          select: {
            id: true,
            companyName: true,
            email: true,
            createdAt: true,
          },
        })
      : [],
  ]);

  const purchaseMap = new Map(purchases.map((p) => [p.id, p]));
  const sponsorMap = new Map(sponsorOrders.map((s) => [s.id, s]));

  const items = earnings.map((e) => {
    const type = e.sourceType === 'purchase' ? 'plano' : 'patrocínio';
    let clientLabel = '—';
    if (e.sourceType === 'purchase') {
      const p = purchaseMap.get(e.sourceId);
      clientLabel = p?.user?.name?.trim() || p?.user?.email || '—';
    } else {
      const s = sponsorMap.get(e.sourceId);
      clientLabel = s?.companyName?.trim() || s?.email || '—';
    }
    return {
      id: e.id,
      type,
      clientLabel,
      date: e.createdAt.toISOString(),
      commissionCents: e.amountCents,
      commissionPercent: e.commissionPercent,
      status: e.status,
    };
  });

  return NextResponse.json({ items });
}
