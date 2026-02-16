import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyStripeWebhook } from '@/lib/payments/stripe';
import { sendTransactionalEmail } from '@/lib/email/emailService';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

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
      const sponsorOrderId = obj.metadata?.sponsorOrderId;
      const purchaseId = obj.metadata?.purchaseId;

      // Pedido de patrocínio (compra pelo site)
      if (sponsorOrderId) {
        const order = await prisma.sponsorOrder.findUnique({
          where: { id: sponsorOrderId },
          include: { sponsorPlan: true },
        });
        if (order && order.paymentStatus !== 'paid') {
          await prisma.sponsorOrder.update({
            where: { id: order.id },
            data: { paymentStatus: 'paid', externalId: obj.id },
          });

          const startAt = new Date();
          let endAt = new Date();
          const period = order.sponsorPlan.billingPeriod;
          if (period === 'monthly') endAt = addMonths(startAt, 1);
          else if (period === 'quarterly') endAt = addMonths(startAt, 3);
          else if (period === 'yearly') endAt = addMonths(startAt, 12);
          else endAt = addMonths(startAt, 1);

          await prisma.sponsor.create({
            data: {
              name: order.companyName,
              websiteUrl: order.websiteUrl,
              logoUrl: order.logoUrl,
              tier: 'APOIO',
              priority: 0,
              isActive: true,
              startAt,
              endAt,
              planId: order.sponsorPlanId,
              teamId: order.teamId,
            },
          });

          if (order.teamId && order.amountToTeamCents > 0) {
            await prisma.teamSponsorshipEarning.create({
              data: {
                teamId: order.teamId,
                sponsorOrderId: order.id,
                amountCents: order.amountToTeamCents,
                status: 'pending',
              },
            });
          }

          const amountFormatted = (order.amountCents / 100).toFixed(2).replace('.', ',');
          sendTransactionalEmail({
            to: order.email,
            templateKey: 'SPONSOR_CONFIRMATION',
            vars: {
              company_name: order.companyName,
              plan_name: order.sponsorPlan.name,
              amount: amountFormatted,
            },
          }).catch((e) => console.error('[Stripe] Email patrocínio:', e));
        }
        return NextResponse.json({ received: true });
      }

      // Compra normal (Plan/Purchase)
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

      if (purchase.teamId && purchase.amountToTeamCents > 0) {
        await prisma.teamPlanEarning.create({
          data: {
            teamId: purchase.teamId,
            purchaseId: purchase.id,
            amountCents: purchase.amountToTeamCents,
            status: 'pending',
          },
        });
      }

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

      const user = await prisma.user.findUnique({ where: { id: purchase.userId } });
      if (user?.email) {
        const planPrice = (purchase.plan.price ?? 0).toFixed(2).replace('.', ',');
        sendTransactionalEmail({
          to: user.email,
          templateKey: 'PURCHASE_CONFIRMATION',
          vars: {
            name: user.name || user.email.split('@')[0],
            plan_name: purchase.plan.name,
            amount: planPrice,
          },
          userId: user.id,
        }).catch((e) => console.error('[Stripe] Email compra:', e));
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
