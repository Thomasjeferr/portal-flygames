import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { markSlotAsPaid } from '@/services/pre-sale-slot.service';
import { createClubViewerAccountForSlot } from '@/services/club-viewer.service';
import { Provider } from '@/lib/pre-sale/enums';
import { verifyWooviWebhookSignature } from '@/lib/payments/woovi';
import { sendTransactionalEmail } from '@/lib/email/emailService';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const secret = process.env.WOOVI_WEBHOOK_SECRET;
    if (!secret) {
      return NextResponse.json({ error: 'Webhook Woovi nao configurado' }, { status: 503 });
    }
    const signature = request.headers.get('x-hub-signature-256') ?? request.headers.get('x-webhook-signature') ?? '';
    if (!verifyWooviWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Assinatura invalida' }, { status: 401 });
    }
    const body = JSON.parse(rawBody);
    const event = body.event ?? body.status;
    const externalId = (body.externalId ?? body.customId ?? body.id) as string | undefined;

    if (event !== 'charge.paid' && body.status !== 'COMPLETED') {
      return NextResponse.json({ received: true });
    }
    if (!externalId) return NextResponse.json({ error: 'externalId missing' }, { status: 400 });

    // Pré-estreia: externalId = presale-{slotId}
    if (typeof externalId === 'string' && externalId.startsWith('presale-')) {
      const slotId = externalId.replace('presale-', '');
      await markSlotAsPaid(slotId, Provider.WOOVI, body.id ?? externalId);
      createClubViewerAccountForSlot(slotId).catch((e) =>
        console.error('[Woovi] Erro ao criar conta clube:', e)
      );
      return NextResponse.json({ received: true });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: externalId },
      include: { plan: true, partner: true },
    });
    if (!purchase || purchase.paymentStatus === 'paid') return NextResponse.json({ received: true });

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
          paymentGateway: 'woovi',
          externalSubscriptionId: purchase.id,
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
      }).catch((e) => console.error('[Woovi] Email compra:', e));
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('Woovi webhook error:', e);
    try {
      await prisma.webhookEvent.create({
        data: {
          provider: 'WOOVI',
          eventId: `fail-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          status: 'FAILED',
        },
      });
    } catch (_) {}
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 });
  }
}
