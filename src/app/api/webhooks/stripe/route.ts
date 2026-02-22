import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyStripeWebhook, getStripe } from '@/lib/payments/stripe';
import { sendTransactionalEmail } from '@/lib/email/emailService';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';

  const event = (await verifyStripeWebhook(payload, signature)) as {
    type: string;
    data: {
      object: {
        id: string;
        metadata?: Record<string, string>;
        invoice?: string | null;
      };
    };
  } | null;
  if (!event) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    // Cobrança de assinatura recorrente: tratada em invoice.paid (usa favoriteTeamId do usuário).
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as { id: string; subscription?: string | { id: string }; amount_paid?: number };
      const sub = invoice.subscription;
      const subscriptionId = typeof sub === 'string' ? sub : sub != null && typeof sub === 'object' ? sub.id : null;
      if (!subscriptionId) return NextResponse.json({ received: true });

      const stripe = await getStripe();
      if (!stripe) return NextResponse.json({ received: true });

      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      const metadata = stripeSubscription.metadata || {};
      const userId = metadata.userId;
      const planId = metadata.planId;
      if (!userId || !planId) return NextResponse.json({ received: true });

      const [user, plan] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, favoriteTeamId: true } }),
        prisma.plan.findUnique({ where: { id: planId } }),
      ]);
      if (!user || !plan || !plan.active) return NextResponse.json({ received: true });

      const amountCents = typeof invoice.amount_paid === 'number' ? invoice.amount_paid : Math.round(plan.price * 100);
      let amountToTeamCents = 0;
      let teamId: string | null = null;
      if (plan.teamPayoutPercent > 0 && user.favoriteTeamId) {
        const team = await prisma.team.findUnique({ where: { id: user.favoriteTeamId }, select: { id: true, isActive: true } });
        if (team?.isActive) {
          teamId = team.id;
          amountToTeamCents = Math.round((amountCents * plan.teamPayoutPercent) / 100);
        }
      }

      const purchase = await prisma.purchase.create({
        data: {
          userId: user.id,
          planId: plan.id,
          gameId: null,
          teamId,
          amountToTeamCents,
          paymentStatus: 'paid',
          paymentGateway: 'stripe',
          externalId: invoice.id,
        },
      });

      if (teamId && amountToTeamCents > 0) {
        await prisma.teamPlanEarning.create({
          data: { teamId, purchaseId: purchase.id, amountCents: amountToTeamCents, status: 'pending' },
        });
      }

      const startDate = new Date();
      let endDate = new Date();
      if (plan.periodicity === 'mensal') endDate.setMonth(endDate.getMonth() + 1);
      else if (plan.periodicity === 'anual') endDate.setFullYear(endDate.getFullYear() + 1);
      else endDate.setDate(endDate.getDate() + (plan.duracaoDias ?? 30));

      await prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          planId: plan.id,
          active: true,
          startDate,
          endDate,
          paymentGateway: 'stripe',
          externalSubscriptionId: subscriptionId,
        },
        update: { active: true, startDate, endDate, planId: plan.id },
      });

      const planPrice = (amountCents / 100).toFixed(2).replace('.', ',');
      sendTransactionalEmail({
        to: user.email,
        templateKey: 'PURCHASE_CONFIRMATION',
        vars: {
          name: user.name || user.email.split('@')[0],
          plan_name: plan.name,
          amount: planPrice,
        },
        userId: user.id,
      }).catch((e) => console.error('[Stripe] invoice.paid email:', e));

      return NextResponse.json({ received: true });
    }

    if (event.type === 'payment_intent.succeeded') {
      const obj = event.data.object as { id: string; metadata?: Record<string, string>; invoice?: string | null };
      const sponsorOrderId = obj.metadata?.sponsorOrderId;
      const purchaseId = obj.metadata?.purchaseId;

      // Pagamento de assinatura Stripe (primeira fatura): tratado em invoice.paid, não aqui.
      if (obj.invoice) return NextResponse.json({ received: true });

      // Pedido de patrocínio (compra pelo site)
      if (sponsorOrderId) {
        const order = await prisma.sponsorOrder.findUnique({
          where: { id: sponsorOrderId },
          include: { sponsorPlan: true, partner: true },
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

          if (order.partnerId && order.partner && order.partner.status === 'approved') {
            const grossAmountCents = order.amountCents;
            const planPartnerPercent = order.sponsorPlan.partnerCommissionPercent ?? 0;
            let commissionPercent = planPartnerPercent > 0 ? planPartnerPercent : (order.partner.sponsorCommissionPercent ?? 0);
            if (commissionPercent < 0) commissionPercent = 0;
            if (commissionPercent > 100) commissionPercent = 100;
            const partnerAmountCents = Math.round((grossAmountCents * commissionPercent) / 100);
            if (partnerAmountCents > 0) {
              await prisma.partnerEarning.create({
                data: {
                  partnerId: order.partnerId,
                  sourceType: 'sponsor',
                  sourceId: order.id,
                  grossAmountCents,
                  commissionPercent,
                  amountCents: partnerAmountCents,
                  status: 'pending',
                },
              });
            }
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
        include: { plan: true, partner: true },
      });

      if (!purchase || purchase.paymentStatus === 'paid') {
        return NextResponse.json({ received: true });
      }

      await prisma.purchase.update({
        where: { id: purchase.id },
        data: { paymentStatus: 'paid', externalId: obj.id },
      });

      // Atualiza time do coração do usuário quando a compra tem time (primeira vez ou atualiza)
      if (purchase.teamId) {
        await prisma.user.update({
          where: { id: purchase.userId },
          data: { favoriteTeamId: purchase.teamId },
        });
      }

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

      if (purchase.partnerId && purchase.partner && purchase.partner.status === 'approved') {
        const planPriceCents = Math.round((purchase.plan.price ?? 0) * 100);
        const planPartnerPercent = purchase.plan.partnerCommissionPercent ?? 0;
        let commissionPercent = planPartnerPercent > 0
          ? planPartnerPercent
          : (purchase.plan.type === 'unitario'
            ? purchase.partner.gameCommissionPercent
            : purchase.partner.planCommissionPercent);
        if (commissionPercent < 0) commissionPercent = 0;
        if (commissionPercent > 100) commissionPercent = 100;
        const partnerAmountCents = Math.round((planPriceCents * commissionPercent) / 100);
        if (partnerAmountCents > 0) {
          await prisma.partnerEarning.create({
            data: {
              partnerId: purchase.partnerId,
              sourceType: 'purchase',
              sourceId: purchase.id,
              grossAmountCents: planPriceCents,
              commissionPercent,
              amountCents: partnerAmountCents,
              status: 'pending',
            },
          });
        }
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
