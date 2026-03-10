import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyStripeWebhook, getStripe } from '@/lib/payments/stripe';
import { sendTransactionalEmail } from '@/lib/email/emailService';
import { markTournamentRegistrationAsPaid } from '@/lib/tournamentRegistrationPayment';
import {
  processTournamentGoalSubscriptionPaid,
  recalculateGoalSupportersAndConfirm,
  ensurePortalSubscriptionForGoalSupporter,
  deactivatePortalSubscriptionByStripeId,
} from '@/lib/tournamentGoalPayment';
import { cancelStripeSubscription } from '@/lib/payments/stripe';
import { recalculatePreSaleGameStatus } from '@/services/pre-sale-status.service';

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
    // Se no futuro houver renovação de patrocínio (Stripe Subscription com metadata sponsorPlanId + userId),
    // usar o favoriteTeamId atual do usuário para a comissão; se favoriteTeamId for null, não criar TeamSponsorshipEarning.
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as {
        id: string;
        subscription?: string | { id: string };
        amount_paid?: number;
        lines?: { data?: Array<{ metadata?: Record<string, string> }> };
        parent?: {
          subscription_details?: { metadata?: Record<string, string>; subscription?: string | { id: string } };
        };
      };
      let sub = invoice.subscription;
      if (!sub && invoice.parent?.subscription_details?.subscription) {
        sub = invoice.parent.subscription_details.subscription;
      }
      const subscriptionId = typeof sub === 'string' ? sub : sub != null && typeof sub === 'object' ? sub.id : null;
      if (!subscriptionId) return NextResponse.json({ received: true });

      const stripe = await getStripe();
      if (!stripe) return NextResponse.json({ received: true });

      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      let metadata = stripeSubscription.metadata || {};
      // Fallback 1: evento pode trazer userId/planId em line item ou parent
      if (!metadata.userId || !metadata.planId) {
        const fromLine = invoice.lines?.data?.[0]?.metadata;
        const fromParent = invoice.parent?.subscription_details?.metadata;
        if (fromLine?.userId && fromLine?.planId) metadata = { ...metadata, ...fromLine };
        else if (fromParent?.userId && fromParent?.planId) metadata = { ...metadata, ...fromParent };
      }
      // Fallback 2: buscar invoice na API (payload do webhook às vezes vem sem lines/parent)
      if (!metadata.userId || !metadata.planId) {
        try {
          const fullInvoice = await stripe.invoices.retrieve(invoice.id, { expand: ['lines.data'] });
          const lineMeta = fullInvoice.lines?.data?.[0]?.metadata;
          if (lineMeta?.userId && lineMeta?.planId) metadata = { ...metadata, ...lineMeta };
        } catch (_) { /* ignore */ }
      }

      // Patrocínio recorrente: type === 'sponsor' e sponsorOrderId no metadata
      if (metadata.type === 'sponsor' && metadata.sponsorOrderId) {
        const sponsorOrderId = metadata.sponsorOrderId;
        const order = await prisma.sponsorOrder.findUnique({
          where: { id: sponsorOrderId },
          include: { sponsorPlan: true, partner: true },
        });
        if (!order) {
          console.warn('[Stripe] invoice.paid sponsor: pedido não encontrado', { sponsorOrderId });
          return NextResponse.json({ received: true });
        }

        const existingSponsor = await prisma.sponsor.findUnique({
          where: { externalSubscriptionId: subscriptionId },
        });
        const startAt = new Date();
        let endAt = new Date();
        const period = order.sponsorPlan.billingPeriod;
        if (period === 'monthly') endAt = addMonths(startAt, 1);
        else if (period === 'quarterly') endAt = addMonths(startAt, 3);
        else if (period === 'yearly') endAt = addMonths(startAt, 12);
        else endAt = addMonths(startAt, 1);

        const hasLoyalty = order.sponsorPlan.hasLoyalty && (order.sponsorPlan.loyaltyMonths ?? 0) > 0;
        const loyaltyMonths = hasLoyalty ? (order.sponsorPlan.loyaltyMonths ?? 0) : 0;
        const loyaltyStartDate = startAt;
        const loyaltyEndDate = hasLoyalty ? addMonths(startAt, loyaltyMonths) : null;
        const contractStatus = hasLoyalty ? 'loyalty_active' : 'active';

        if (existingSponsor) {
          await prisma.sponsor.update({
            where: { id: existingSponsor.id },
            data: { endAt },
          });
          console.info('[Stripe] invoice.paid sponsor: renovação', { sponsorOrderId, subscriptionId });
          return NextResponse.json({ received: true });
        }

        if (order.paymentStatus !== 'paid') {
          await prisma.sponsorOrder.update({
            where: { id: order.id },
            data: { paymentStatus: 'paid', externalId: subscriptionId },
          });
        }

        const sponsorByOrder = await prisma.sponsor.findUnique({
          where: { sponsorOrderId: order.id },
        });
        if (!sponsorByOrder) {
          await prisma.sponsor.create({
            data: {
              name: order.companyName,
              websiteUrl: order.websiteUrl,
              whatsapp: order.whatsapp,
              instagram: order.instagram,
              logoUrl: order.logoUrl,
              tier: 'APOIO',
              priority: 0,
              isActive: true,
              startAt,
              endAt,
              planId: order.sponsorPlanId,
              teamId: order.teamId,
              sponsorOrderId: order.id,
              externalSubscriptionId: subscriptionId,
              planType: order.sponsorPlan.type ?? 'sponsor_company',
              hasLoyalty,
              loyaltyMonths,
              loyaltyStartDate,
              loyaltyEndDate,
              contractStatus,
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

          if (order.userId && order.teamId) {
            await prisma.user.update({
              where: { id: order.userId },
              data: { favoriteTeamId: order.teamId },
            }).catch(() => {});
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

      const tournamentId = metadata.tournamentId;
      const teamIdMeta = metadata.teamId;
      const planIdMeta = metadata.planId;
      if (tournamentId && teamIdMeta) {
        if (planIdMeta === 'tournament-goal') {
          const userId = metadata.userId;
          const amountCents =
            typeof invoice.amount_paid === 'number' ? Math.round(invoice.amount_paid) : undefined;
          if (userId) {
            await processTournamentGoalSubscriptionPaid(
              userId,
              tournamentId,
              teamIdMeta,
              subscriptionId,
              amountCents
            );
            await ensurePortalSubscriptionForGoalSupporter(userId, subscriptionId);
            console.info('[Stripe] Apoio GOAL torneio registrado:', tournamentId, teamIdMeta);
          }
          return NextResponse.json({ received: true });
        }
      }

      const userId = metadata.userId;
      const planId = metadata.planId;
      if (!userId || !planId) {
        console.warn('[Stripe] invoice.paid: subscription sem userId ou planId no metadata', { subscriptionId, metadataKeys: Object.keys(metadata) });
        return NextResponse.json({ received: true });
      }

      const [user, plan] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, favoriteTeamId: true } }),
        prisma.plan.findUnique({ where: { id: planId } }),
      ]);
      if (!user || !plan || !plan.active) {
        console.warn('[Stripe] invoice.paid: user ou plan não encontrado/inativo', { userId, planId, userFound: !!user, planFound: !!plan, planActive: plan?.active ?? false });
        return NextResponse.json({ received: true });
      }

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

      // Idempotência: se já existe Purchase para esta invoice (ex.: reenvio do webhook), não duplicar
      const existingPurchase = await prisma.purchase.findFirst({
        where: { externalId: invoice.id, userId: user.id },
        include: { planEarnings: true },
      });
      type PurchaseWithEarnings = NonNullable<typeof existingPurchase>;
      let purchase: PurchaseWithEarnings | null = existingPurchase;
      let isNewPurchase = false;
      if (!purchase) {
        isNewPurchase = true;
        const created = await prisma.purchase.create({
          data: {
            userId: user.id,
            planId: plan.id,
            gameId: null,
            teamId,
            amountCents,
            amountToTeamCents,
            paymentStatus: 'paid',
            paymentGateway: 'stripe',
            externalId: invoice.id,
          },
        });
        purchase = created as PurchaseWithEarnings;
        if (teamId && amountToTeamCents > 0) {
          await prisma.teamPlanEarning.create({
            data: { teamId, purchaseId: purchase.id, amountCents: amountToTeamCents, status: 'pending' },
          });
        }
      } else if (teamId && amountToTeamCents > 0 && (!purchase.planEarnings || purchase.planEarnings.length === 0)) {
        await prisma.teamPlanEarning.create({
          data: { teamId, purchaseId: purchase.id, amountCents: amountToTeamCents, status: 'pending' },
        });
      }

      const startDate = new Date();
      let endDate = new Date();
      if (plan.periodicity === 'mensal') endDate.setMonth(endDate.getMonth() + 1);
      else if (plan.periodicity === 'anual') endDate.setFullYear(endDate.getFullYear() + 1);
      else endDate.setDate(endDate.getDate() + (plan.duracaoDias ?? 30));

      // Troca de plano: cancelar a assinatura antiga no Stripe para não cobrar duas vezes.
      const currentSub = await prisma.subscription.findUnique({
        where: { userId: user.id },
        select: { externalSubscriptionId: true },
      });
      if (currentSub?.externalSubscriptionId && currentSub.externalSubscriptionId !== subscriptionId) {
        await cancelStripeSubscription(currentSub.externalSubscriptionId);
        console.info('[Stripe] invoice.paid: assinatura antiga cancelada (troca de plano)', { oldId: currentSub.externalSubscriptionId });
      }

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
        update: { active: true, startDate, endDate, planId: plan.id, externalSubscriptionId: subscriptionId },
      });

      console.info('[Stripe] invoice.paid: assinatura ativada', { userId: user.id, planId: plan.id, subscriptionId });

      // Pré-estreia Meta: recalcular status dos jogos em que o time do usuário participa (pode liberar FUNDED/PUBLISHED)
      if (user.favoriteTeamId && plan.type === 'recorrente') {
        const metaGames = await prisma.preSaleGame.findMany({
          where: {
            metaEnabled: true,
            status: 'PRE_SALE',
            OR: [
              { homeTeamId: user.favoriteTeamId },
              { awayTeamId: user.favoriteTeamId },
            ],
          },
          select: { id: true },
        });
        for (const g of metaGames) {
          recalculatePreSaleGameStatus(g.id).catch((e) =>
            console.error('[Stripe] invoice.paid recalculate pre-sale meta:', g.id, e)
          );
        }
      }

      if (isNewPurchase) {
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
      }

      return NextResponse.json({ received: true });
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as { id: string; metadata?: Record<string, string> };
      const subscriptionId = sub.id;
      const metadata = sub.metadata || {};
      if (metadata.planId === 'tournament-goal' && metadata.tournamentId && metadata.teamId) {
        const ts = await prisma.tournamentSubscription.findFirst({
          where: { stripeSubscriptionId: subscriptionId },
        });
        if (ts) {
          await prisma.tournamentSubscription.update({
            where: { id: ts.id },
            data: { status: 'CANCELED', endedAt: new Date() },
          });
          await recalculateGoalSupportersAndConfirm(metadata.tournamentId, metadata.teamId);
          await deactivatePortalSubscriptionByStripeId(subscriptionId);
          console.info('[Stripe] Assinatura GOAL cancelada, contagem atualizada:', metadata.tournamentId, metadata.teamId);
        }
      } else if (metadata.userId && metadata.planId) {
        // Assinatura de plano do portal: desativar nosso registro para não renovar acesso após o fim no Stripe.
        const ourSub = await prisma.subscription.findFirst({
          where: { externalSubscriptionId: subscriptionId },
          select: { id: true, userId: true },
        });
        if (ourSub) {
          await prisma.subscription.update({
            where: { id: ourSub.id },
            data: { active: false },
          });
          console.info('[Stripe] Assinatura portal cancelada/encerrada', { userId: ourSub.userId });
        }
      } else if (metadata.type === 'sponsor' || metadata.sponsorOrderId) {
        const sponsor = await prisma.sponsor.findFirst({
          where: { externalSubscriptionId: subscriptionId },
          select: { id: true },
        });
        if (sponsor) {
          await prisma.sponsor.update({
            where: { id: sponsor.id },
            data: { isActive: false, contractStatus: 'cancelled' },
          });
          console.info('[Stripe] Patrocínio cancelado no Stripe: acesso revogado', { subscriptionId });
        }
      }
      return NextResponse.json({ received: true });
    }

    if (event.type === 'payment_intent.succeeded') {
      const obj = event.data.object as { id: string; metadata?: Record<string, string>; invoice?: string | null };
      const sponsorOrderId = obj.metadata?.sponsorOrderId;
      const purchaseId = obj.metadata?.purchaseId;

      // Primeira cobrança de assinatura recorrente: Stripe envia payment_intent.succeeded com invoice.
      // Fallback: se invoice.paid falhar ou atrasar, processamos aqui para ativar a assinatura no painel.
      if (obj.invoice) {
        const stripe = await getStripe();
        if (stripe) {
          try {
            const invoiceId = typeof obj.invoice === 'string' ? obj.invoice : (obj.invoice as { id?: string })?.id;
            if (invoiceId) {
              const invoice = await stripe.invoices.retrieve(invoiceId) as { subscription?: string | { id: string }; amount_paid?: number };
              const sub = invoice.subscription;
              const subscriptionId = typeof sub === 'string' ? sub : sub != null && typeof sub === 'object' ? sub.id : null;
              if (subscriptionId) {
                const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
                const metadata = stripeSubscription.metadata || {};
                const planIdMeta = metadata.planId;
                const userId = metadata.userId;
                // Só processar se for plano do portal (não tournament-goal, que já tem fluxo próprio)
                if (userId && planIdMeta && !metadata.tournamentId) {
                  const existingSub = await prisma.subscription.findFirst({
                    where: { externalSubscriptionId: subscriptionId },
                  });
                  if (!existingSub) {
                    const [user, plan] = await Promise.all([
                      prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, favoriteTeamId: true } }),
                      prisma.plan.findUnique({ where: { id: planIdMeta } }),
                    ]);
                    if (user && plan && plan.active) {
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
                          amountCents,
                          amountToTeamCents,
                          paymentStatus: 'paid',
                          paymentGateway: 'stripe',
                          externalId: invoiceId,
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
                      console.info('[Stripe] Assinatura ativada via payment_intent.succeeded (fallback):', userId, planIdMeta);
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error('[Stripe] Fallback subscription from payment_intent.succeeded:', e);
          }
        }
        return NextResponse.json({ received: true });
      }

      // Inscrição paga de torneio (pagamento único com cartão): PaymentIntent com metadata tournamentId + teamId
      const tournamentId = obj.metadata?.tournamentId;
      const teamId = obj.metadata?.teamId;
      if (tournamentId && teamId) {
        const updated = await markTournamentRegistrationAsPaid(tournamentId, teamId);
        if (updated) {
          console.info('[Stripe] Inscrição torneio (cartão) confirmada:', tournamentId, teamId);
        }
        return NextResponse.json({ received: true });
      }

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

          const hasLoyaltyLegacy = order.sponsorPlan.hasLoyalty && (order.sponsorPlan.loyaltyMonths ?? 0) > 0;
          const loyaltyMonthsLegacy = hasLoyaltyLegacy ? (order.sponsorPlan.loyaltyMonths ?? 0) : 0;

          await prisma.sponsor.create({
            data: {
              name: order.companyName,
              websiteUrl: order.websiteUrl,
              whatsapp: order.whatsapp,
              instagram: order.instagram,
              logoUrl: order.logoUrl,
              tier: 'APOIO',
              priority: 0,
              isActive: true,
              startAt,
              endAt,
              planId: order.sponsorPlanId,
              teamId: order.teamId,
              sponsorOrderId: order.id,
              planType: order.sponsorPlan.type ?? 'sponsor_company',
              hasLoyalty: hasLoyaltyLegacy,
              loyaltyMonths: loyaltyMonthsLegacy,
              loyaltyStartDate: startAt,
              loyaltyEndDate: hasLoyaltyLegacy ? addMonths(startAt, loyaltyMonthsLegacy) : null,
              contractStatus: hasLoyaltyLegacy ? 'loyalty_active' : 'active',
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

          // Marca o time do coração do usuário quando pagou patrocínio com time escolhido (igual ao plano)
          if (order.userId && order.teamId) {
            await prisma.user.update({
              where: { id: order.userId },
              data: { favoriteTeamId: order.teamId },
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
