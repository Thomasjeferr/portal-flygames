/**
 * Integração Woovi/OpenPix (Pix).
 * Documentação: https://developers.woovi.com/ — usa API OpenPix.
 * Autenticação: appID (base64 de Client_Id:Client_Secret) em "API Key" no admin.
 * Variáveis de ambiente: WOOVI_API_KEY (ou config no Admin > Pagamentos).
 */

const OPENPIX_API = 'https://api.openpix.com.br';

export interface WooviChargeInput {
  amount: number; // centavos
  customer: string; // email do cliente
  customerName?: string; // nome (opcional)
  description?: string;
  externalId: string; // id da compra (correlationID)
}

export interface WooviChargeResponse {
  id: string;
  status: string;
  qrCode?: string;
  qrCodeImage?: string;
  brCode?: string;
  expiresAt?: string;
  [key: string]: unknown;
}

export async function createWooviCharge(input: WooviChargeInput): Promise<WooviChargeResponse | null> {
  let appId = process.env.WOOVI_API_KEY;
  if (!appId) {
    const { getPaymentConfig } = await import('@/lib/payment-config');
    const config = await getPaymentConfig();
    appId = config.wooviApiKey ?? undefined;
  }
  if (!appId || !appId.trim()) {
    console.warn('WOOVI_API_KEY / Woovi API Key (appID) não configurada');
    return null;
  }

  const trimmedAppId = appId.trim();
  const name = (input.customerName || input.customer || 'Cliente').slice(0, 100);
  const email = input.customer || '';

  try {
    const res = await fetch(`${OPENPIX_API}/api/openpix/v1/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: trimmedAppId,
      },
      body: JSON.stringify({
        correlationID: input.externalId,
        value: input.amount,
        comment: input.description ?? 'Fly Games',
        customer: {
          name,
          email,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Woovi charge error:', res.status, err);
      return null;
    }

    const data = (await res.json()) as { charge?: WooviChargeResponse; brCode?: string; qrCodeImage?: string; [key: string]: unknown };
    const charge = data.charge ?? data;
    const id = (charge as { id?: string }).id;
    const brCode = (charge as { brCode?: string }).brCode ?? (data as { brCode?: string }).brCode;
    const qrCodeImage = (charge as { qrCodeImage?: string }).qrCodeImage ?? (data as { qrCodeImage?: string }).qrCodeImage;
    const expiresDate = (charge as { expiresDate?: string }).expiresDate;
    const expiresIn = (charge as { expiresIn?: number }).expiresIn;

    let expiresAt: string | undefined;
    if (typeof expiresDate === 'string') {
      expiresAt = expiresDate;
    } else if (typeof expiresIn === 'number') {
      const d = new Date();
      d.setSeconds(d.getSeconds() + expiresIn);
      expiresAt = d.toISOString();
    }

    return {
      ...charge,
      id: id ?? input.externalId,
      status: (charge as { status?: string }).status ?? 'ACTIVE',
      qrCode: brCode ?? (charge as WooviChargeResponse).qrCode,
      qrCodeImage: qrCodeImage ?? (charge as WooviChargeResponse).qrCodeImage,
      expiresAt: expiresAt,
    } as WooviChargeResponse;
  } catch (e) {
    console.error('Woovi createCharge error:', e);
    return null;
  }
}

/**
 * Consulta uma cobrança Woovi/OpenPix pelo ID ou correlationID.
 * Usado como fallback para sincronizar o status de pagamentos Pix
 * caso o webhook não dispare ou falhe por algum motivo.
 */
export async function getWooviChargeStatus(idOrCorrelationId: string): Promise<WooviChargeResponse | null> {
  let appId = process.env.WOOVI_API_KEY;
  if (!appId) {
    const { getPaymentConfig } = await import('@/lib/payment-config');
    const config = await getPaymentConfig();
    appId = config.wooviApiKey ?? undefined;
  }
  if (!appId || !appId.trim()) {
    console.warn('WOOVI_API_KEY / Woovi API Key (appID) não configurada (getWooviChargeStatus)');
    return null;
  }

  const trimmedAppId = appId.trim();

  try {
    // Mesmo base path da criação: /api/openpix/v1/charge (OpenPix/Woovi)
    const res = await fetch(`${OPENPIX_API}/api/openpix/v1/charge/${encodeURIComponent(idOrCorrelationId)}`, {
      method: 'GET',
      headers: {
        Authorization: trimmedAppId,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Woovi get charge error:', res.status, err);
      return null;
    }

    const data = (await res.json()) as { charge?: WooviChargeResponse } & WooviChargeResponse;
    const charge = (data.charge ?? data) as WooviChargeResponse;
    return charge;
  } catch (e) {
    console.error('Woovi getChargeStatus error:', e);
    return null;
  }
}

import { createVerify } from 'crypto';

/**
 * Verifica assinatura do webhook Woovi/OpenPix.
 *
 * A Woovi fornece uma **chave pública** (RSA) para validar o webhook.
 * O header pode vir como:
 * - `x-webhook-signature`: assinatura base64 do payload
 * - ou `x-hub-signature-256`: formato `sha256=BASE64_ASSINATURA`
 */
export function verifyWooviWebhookSignature(payload: string, signatureHeader: string, secret?: string): boolean {
  const rawSecret = secret ?? process.env.WOOVI_WEBHOOK_SECRET;
  const sigHeader = signatureHeader?.trim();
  if (!rawSecret || !sigHeader) return false;

  try {
    // Normaliza a chave pública: aceita tanto PEM completo quanto base64 "seco".
    let publicKeyPem: string;
    if (rawSecret.includes('BEGIN PUBLIC KEY')) {
      publicKeyPem = rawSecret;
    } else {
      const wrapped = rawSecret.replace(/\s+/g, '');
      const lines = wrapped.match(/.{1,64}/g) ?? [wrapped];
      publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----\n`;
    }

    // Extrai assinatura: se tiver "sha256=", tira o prefixo.
    const base64Signature = sigHeader.startsWith('sha256=')
      ? sigHeader.slice('sha256='.length).trim()
      : sigHeader;
    const signature = Buffer.from(base64Signature, 'base64');

    const verifier = createVerify('sha256');
    verifier.update(payload);
    verifier.end();

    return verifier.verify(publicKeyPem, signature);
  } catch {
    return false;
  }
}

