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
