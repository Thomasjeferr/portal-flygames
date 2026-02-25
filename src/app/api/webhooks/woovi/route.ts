import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { markSlotAsPaid } from '@/services/pre-sale-slot.service';
import { createClubViewerAccountForSlot } from '@/services/club-viewer.service';
import { Provider } from '@/lib/pre-sale/enums';
import { verifyWooviWebhookSignature } from '@/lib/payments/woovi';
import { markWooviPurchaseAsPaid } from '@/lib/payments/wooviPurchaseHandler';

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

    await markWooviPurchaseAsPaid(correlationId);
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
