import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { markSlotAsPaid } from '@/services/pre-sale-slot.service';
import { createClubViewerAccountForSlot } from '@/services/club-viewer.service';
import { Provider } from '@/lib/pre-sale/enums';
import { verifyWooviWebhookSignature } from '@/lib/payments/woovi';
import { markWooviPurchaseAsPaid } from '@/lib/payments/wooviPurchaseHandler';
import { markTournamentRegistrationAsPaidById } from '@/lib/tournamentRegistrationPayment';

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
      console.warn('[Woovi webhook] Assinatura inválida (401). Verifique se o "Segredo do webhook" no Admin é a chave pública RSA da Woovi.');
      return NextResponse.json({ error: 'Assinatura invalida' }, { status: 401 });
    }

    if (isTestEvent) {
      return NextResponse.json({ received: true });
    }

    const rawEvent = body.event as string | undefined;
    const charge = body.charge ?? body.pix?.charge ?? body;
    const chargeStatus = (charge?.status as string | undefined) ?? (body.status as string | undefined);

    // Log para diagnóstico em produção (sem dados sensíveis)
    const logPayload = {
      event: rawEvent,
      chargeStatus,
      hasCharge: !!charge,
      chargeId: (charge as { id?: string })?.id ?? (body as { id?: string })?.id,
    };
    console.info('[Woovi webhook]', JSON.stringify(logPayload));

    const isCompletedEvent =
      (typeof rawEvent === 'string' && rawEvent.toUpperCase().includes('CHARGE_COMPLETED')) ||
      chargeStatus === 'COMPLETED';

    if (!isCompletedEvent) {
      return NextResponse.json({ received: true });
    }

    // Woovi envia charge.correlationID; aceitar também camelCase (correlationId) e no body
    const correlationId =
      (charge?.correlationID as string | undefined) ??
      (charge as { correlationId?: string })?.correlationId ??
      (body.correlationID as string | undefined) ??
      (body.correlationId as string | undefined);

    if (!correlationId) {
      console.error('[Woovi webhook] correlationID ausente no payload. body.event=', rawEvent, 'charge keys=', charge && typeof charge === 'object' ? Object.keys(charge) : 'n/a');
      return NextResponse.json({ error: 'correlationID missing' }, { status: 400 });
    }

    console.info('[Woovi webhook] CHARGE_COMPLETED correlationID=', correlationId);

    // Valor realmente pago: Woovi/OpenPix pode enviar em centavos (ex.: 503) ou em reais (ex.: 5.03). Normalizar para centavos.
    const rawValue =
      (charge as { value?: number })?.value ??
      (charge as { valueWithDiscount?: number })?.valueWithDiscount ??
      (charge as { amount?: number })?.amount ??
      (body as { value?: number })?.value ??
      (body as { amount?: number })?.amount;
    let wooviChargeValueCents: number | undefined;
    if (typeof rawValue === 'number' && rawValue > 0) {
      if (rawValue < 100 && rawValue % 1 !== 0) {
        wooviChargeValueCents = Math.round(rawValue * 100);
      } else {
        wooviChargeValueCents = Math.round(rawValue);
      }
    } else if (charge && typeof charge === 'object') {
      console.warn('[Woovi webhook] Valor do charge não encontrado; gravando com valor da Purchase. charge keys=', Object.keys(charge));
    }

    // Pré-estreia: externalId = presale-{slotId}
    if (typeof correlationId === 'string' && correlationId.startsWith('presale-')) {
      const slotId = correlationId.replace('presale-', '');
      await markSlotAsPaid(slotId, Provider.WOOVI, body.id ?? correlationId);
      createClubViewerAccountForSlot(slotId).catch((e) =>
        console.error('[Woovi] Erro ao criar conta clube:', e)
      );
      const { sendAdminPreSaleNotification } = await import('@/lib/email/adminNotify');
      const slot = await prisma.preSaleClubSlot.findUnique({
        where: { id: slotId },
        include: { preSaleGame: true },
      });
      if (slot?.preSaleGame) {
        const price = slot.slotIndex === 1 ? slot.preSaleGame.clubAPrice : slot.preSaleGame.clubBPrice;
        sendAdminPreSaleNotification({
          gameTitle: slot.preSaleGame.title,
          slotLabel: slot.slotIndex === 1 ? 'Clube A' : 'Clube B',
          amountFormatted: (price ?? 0).toFixed(2).replace('.', ','),
        }).catch(() => {});
      }
      return NextResponse.json({ received: true });
    }

    // Inscrição paga de torneio (Copa Mata-Mata): correlationID = id do TournamentTeam
    const tournamentTeam = await prisma.tournamentTeam.findUnique({
      where: { id: correlationId },
      select: { id: true, paymentStatus: true, paymentGateway: true },
    });
    if (tournamentTeam?.paymentGateway === 'woovi' && tournamentTeam.paymentStatus === 'pending') {
      const updated = await markTournamentRegistrationAsPaidById(correlationId);
      if (updated) {
        console.info('[Woovi webhook] Inscrição torneio confirmada:', correlationId);
      }
      return NextResponse.json({ received: true });
    }

    await markWooviPurchaseAsPaid(correlationId, wooviChargeValueCents);
    console.info('[Woovi webhook] Compra marcada como paga:', correlationId);
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
