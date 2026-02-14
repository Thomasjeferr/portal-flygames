import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = body.event ?? body.status;
    const externalId = body.externalId ?? body.customId;

    if (event !== 'charge.paid' && body.status !== 'COMPLETED') {
      return NextResponse.json({ received: true });
    }
    if (!externalId) return NextResponse.json({ error: 'externalId missing' }, { status: 400 });

    const purchase = await prisma.purchase.findUnique({
      where: { id: externalId },
      include: { plan: true },
    });
    if (!purchase || purchase.paymentStatus === 'paid') return NextResponse.json({ received: true });

    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { paymentStatus: 'paid' },
    });

    if (purchase.plan.type === 'recorrente' && purchase.plan.acessoTotal) {
      const startDate = new Date();
      let endDate = new Date();
      if (purchase.plan.periodicity === 'mensal') endDate.setMonth(endDate.getMonth() + 1);
      else if (purchase.plan.periodicity === 'anual') endDate.setFullYear(endDate.getFullYear() + 1);
      else endDate.setDate(endDate.getDate() + (purchase.plan.duracaoDias ?? 30));

      await prisma.subscription.upsert({
        where: { userId: purchase.userId },
        create: {
          userId: purchase.userId,
          planId: purchase.planId,
          active: true,
          startDate,
          endDate,
          paymentGateway: 'woovi',
          externalSubscriptionId: purchase.id,
        },
        update: { active: true, startDate, endDate, planId: purchase.planId },
      });
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('Woovi webhook error:', e);
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
