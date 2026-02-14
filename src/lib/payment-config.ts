import { prisma } from '@/lib/db';

export interface PaymentConfigValues {
  wooviApiKey: string | null;
  wooviWebhookSecret: string | null;
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  stripePublishableKey: string | null;
}

let cached: PaymentConfigValues | null | undefined = undefined;

export async function getPaymentConfig(): Promise<PaymentConfigValues> {
  if (cached !== undefined) return cached ?? { wooviApiKey: null, wooviWebhookSecret: null, stripeSecretKey: null, stripeWebhookSecret: null, stripePublishableKey: null };
  const row = await prisma.paymentConfig.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!row) {
    cached = { wooviApiKey: null, wooviWebhookSecret: null, stripeSecretKey: null, stripeWebhookSecret: null, stripePublishableKey: null };
    return cached;
  }
  cached = {
    wooviApiKey: row.wooviApiKey,
    wooviWebhookSecret: row.wooviWebhookSecret,
    stripeSecretKey: row.stripeSecretKey,
    stripeWebhookSecret: row.stripeWebhookSecret,
    stripePublishableKey: row.stripePublishableKey,
  };
  return cached;
}

export function clearPaymentConfigCache(): void {
  cached = undefined;
}
