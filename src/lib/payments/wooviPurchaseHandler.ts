import { prisma } from '@/lib/db';
import { sendTransactionalEmail } from '@/lib/email/emailService';

/**
 * Marca uma purchase Woovi como paga e aplica todos os efeitos
 * colaterais (time do coração, comissões, assinatura, e-mail).
 *
 * Esta função é usada tanto pelo webhook Woovi quanto por fluxos
 * de sincronização/manual (fallback) que consultam o status direto na API.
 */
export async function markWooviPurchaseAsPaid(purchaseId: string): Promise<void> {
  const purchase = await prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { plan: true, partner: true },
  });

  if (!purchase || purchase.paymentStatus === 'paid') {
    return;
  }

  await prisma.purchase.update({
    where: { id: purchase.id },
    data: { paymentStatus: 'paid' },
  });

  // Atualiza time do coração do usuário quando a compra tem time
  if (purchase.teamId) {
    await prisma.user.update({
      where: { id: purchase.userId },
      data: { favoriteTeamId: purchase.teamId },
    });
  }

  // Comissão para time (quando configurado no plano)
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

  // Comissão para parceiro (quando houver parceiro aprovado e comissão > 0)
  if (purchase.partnerId && purchase.partner && purchase.partner.status === 'approved') {
    const planPriceCents = Math.round((purchase.plan.price ?? 0) * 100);
    const planPartnerPercent = purchase.plan.partnerCommissionPercent ?? 0;
    let commissionPercent =
      planPartnerPercent > 0
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

  // Assinatura recorrente com acesso total: ativa/atualiza Subscription
  if (purchase.plan.type === 'recorrente' && purchase.plan.acessoTotal) {
    const startDate = new Date();
    let endDate = new Date();

    if (purchase.plan.periodicity === 'mensal') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (purchase.plan.periodicity === 'anual') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setDate(endDate.getDate() + (purchase.plan.duracaoDias ?? 30));
    }

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
      update: {
        active: true,
        startDate,
        endDate,
        planId: purchase.planId,
      },
    });
  }

  // E-mail de confirmação de compra
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
    }).catch((e) => console.error('[Woovi] Email compra:', e));
  }
}

