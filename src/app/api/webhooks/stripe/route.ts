import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyStripeWebhook } from '@/lib/payments/stripe';

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';

  const event = (await verifyStripeWebhook(payload, signature)) as { type: string; data: { object: { id: string; metadata?: Record<string, string> } } } | null;
  if (!event) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const obj = event.data.object;
      const purchaseId = obj.metadata?.purchaseId;
      if (!purchaseId) return NextResponse.json({ received: true });

      const purchase = await prisma.purchase.findUnique({
        where: { id: purchaseId },
        include: { plan: true },
      });

      if (!purchase || purchase.paymentStatus === 'paid') {
        return NextResponse.json({ received: true });
      }

      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { paymentStatus: 'paid', externalId: obj.id },
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
            paymentGateway: 'stripe',
            externalSubscriptionId: obj.id,
          },
          update: { active: true, startDate, endDate, planId: purchase.planId },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('Stripe webhook error:', e);
    try {
      await prisma.webhookEvent.create({
        data: {
          provider: 'STRIPE',
          eventId: `fail-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          status: 'FAILED',
        },
      });
    } catch (_) {}
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
