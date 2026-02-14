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
  const apiKey = process.env.WOOVI_API_KEY;
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

export function verifyWooviWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.WOOVI_WEBHOOK_SECRET;
  if (!secret) return false;
  // Implementar verificação conforme docs Woovi (ex: HMAC)
  return true;
}
