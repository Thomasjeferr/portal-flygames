/**
 * Integração Woovi (Pix).
 * Documentação: https://docs.woovi.com/
 * Variáveis de ambiente: WOOVI_API_KEY, WOOVI_WEBHOOK_SECRET (opcional)
 */

const WOOVI_API = 'https://api.woovi.com';

export interface WooviChargeInput {
  amount: number; // centavos
  customer: string; // CPF ou email
  description?: string;
  externalId: string; // id da compra no nosso sistema
  expiresIn?: number; // segundos (ex: 3600 = 1h)
}

export interface WooviChargeResponse {
  id: string;
  status: string;
  qrCode?: string;
  qrCodeImage?: string;
  expiresAt?: string;
  [key: string]: unknown;
}

export async function createWooviCharge(input: WooviChargeInput): Promise<WooviChargeResponse | null> {
  let apiKey = process.env.WOOVI_API_KEY;
  if (!apiKey) {
    const { getPaymentConfig } = await import('@/lib/payment-config');
    const config = await getPaymentConfig();
    apiKey = config.wooviApiKey ?? undefined;
  }
  if (!apiKey) {
    console.warn('WOOVI_API_KEY não configurada');
    return null;
  }

  try {
    const res = await fetch(`${WOOVI_API}/api/v1/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        amount: input.amount,
        customer: input.customer,
        description: input.description ?? 'Fly Games',
        externalId: input.externalId,
        expiresIn: input.expiresIn ?? 3600,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Woovi charge error:', res.status, err);
      return null;
    }

    return (await res.json()) as WooviChargeResponse;
  } catch (e) {
    console.error('Woovi createCharge error:', e);
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

