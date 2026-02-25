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
    let secret = process.env.WOOVI_WEBHOOK_SECRET ?? '';

    // Se não houver secret em variável de ambiente, tenta buscar do PaymentConfig (Admin > APIs de Pagamento).
    if (!secret) {
      try {
        const { getPaymentConfig } = await import('@/lib/payment-config');
        const config = await getPaymentConfig();
        secret = config.wooviWebhookSecret ?? '';
      } catch {
        // se der erro aqui, tratamos como não configurado
      }
    }

    const body = JSON.parse(rawBody);

    if (!secret) {
      return NextResponse.json({ error: 'Webhook Woovi nao configurado' }, { status: 503 });
    }

    const isTestEvent =
      body?.evento === 'teste_webhook' ||
      body?.event === 'teste_webhook';

    const signature = request.headers.get('x-hub-signature-256') ?? request.headers.get('x-webhook-signature') ?? '';
    if (!isTestEvent && !verifyWooviWebhookSignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: 'Assinatura invalida' }, { status: 401 });
    }

    if (isTestEvent) {
      return NextResponse.json({ received: true });
    }

    const rawEvent = body.event as string | undefined;
    const charge = body.charge ?? body.pix?.charge ?? body;
    const chargeStatus = (charge?.status as string | undefined) ?? (body.status as string | undefined);

    const isCompletedEvent =
      (typeof rawEvent === 'string' && rawEvent.toUpperCase().includes('CHARGE_COMPLETED')) ||
      chargeStatus === 'COMPLETED';

    if (!isCompletedEvent) {
      return NextResponse.json({ received: true });
    }

    const correlationId =
      (charge?.correlationID as string | undefined) ??
      (body.correlationID as string | undefined);

    if (!correlationId) {
      console.error('[Woovi webhook] correlationID ausente no payload');
      return NextResponse.json({ error: 'correlationID missing' }, { status: 400 });
    }

    // Pré-estreia: externalId = presale-{slotId}
    if (typeof correlationId === 'string' && correlationId.startsWith('presale-')) {
      const slotId = correlationId.replace('presale-', '');
      await markSlotAsPaid(slotId, Provider.WOOVI, body.id ?? correlationId);
      createClubViewerAccountForSlot(slotId).catch((e) =>
        console.error('[Woovi] Erro ao criar conta clube:', e)
      );
      return NextResponse.json({ received: true });
    }

    const purchase = await prisma.purchase.findUnique({
      where: { id: correlationId },
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
