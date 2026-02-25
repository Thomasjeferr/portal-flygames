import { NextResponse } from 'next/server';
import { getApprovedPartner } from '@/lib/partnerAuth';
import { prisma } from '@/lib/db';
import { getAvailableAt } from '@/lib/payoutRules';

export async function POST() {
  const partner = await getApprovedPartner();
  if (!partner) {
    return NextResponse.json({ error: 'Acesso apenas para parceiros aprovados' }, { status: 403 });
  }

  const earnings = await prisma.partnerEarning.findMany({
    where: { partnerId: partner.id, status: 'pending' },
    orderBy: { createdAt: 'asc' },
    include: {
      withdrawalItems: {
        include: { withdrawal: { select: { status: true } } },
      },
    },
  });

  if (!earnings.length) {
    return NextResponse.json({ error: 'Você ainda não tem comissões pendentes.' }, { status: 400 });
  }

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
  const availableEarnings = [];

  for (const e of earnings) {
    // Ignora comissões já vinculadas a saques não cancelados
    const hasActiveWithdrawal = e.withdrawalItems.some((item) => item.withdrawal.status !== 'canceled');
    if (hasActiveWithdrawal) continue;

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
    if (availableAt <= now) {
      availableEarnings.push(e);
    }
  }

  if (!availableEarnings.length) {
    return NextResponse.json(
      { error: 'Você ainda não tem valores liberados para saque. Vendas em cartão liberam após o prazo de compensação.' },
      { status: 400 }
    );
  }

  const totalCents = availableEarnings.reduce((sum, e) => sum + e.amountCents, 0);

  const withdrawal = await prisma.partnerWithdrawal.create({
    data: {
      partnerId: partner.id,
      amountCents: totalCents,
      status: 'requested',
      requestedAt: now,
      items: {
        create: availableEarnings.map((e) => ({
          earningId: e.id,
          amountCents: e.amountCents,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json({
    ok: true,
    withdrawalId: withdrawal.id,
    amountCents: withdrawal.amountCents,
    itemsCount: withdrawal.items.length,
  });
}

