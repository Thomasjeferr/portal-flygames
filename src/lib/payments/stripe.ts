/**
 * Integração Stripe (cartão e assinaturas recorrentes).
 * Variáveis: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
 */

export interface StripePaymentIntentInput {
  amount: number; // centavos
  currency?: string;
  customerEmail?: string;
  metadata: { purchaseId: string; userId: string; planId: string; gameId?: string };
}

export interface StripeSubscriptionInput {
  customerEmail: string;
  priceId: string; // Stripe Price ID do plano
  userId: string;
  planId: string;
  metadata?: Record<string, string>;
}

let stripeInstance: { paymentIntents: { create: (opts: unknown) => Promise<{ client_secret: string; id: string }> }; webhooks: { constructEvent: (payload: string, sig: string, secret: string) => unknown } } | null = null;

function getStripe() {
  if (stripeInstance) return stripeInstance;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = require('stripe');
    stripeInstance = new Stripe(key, { apiVersion: '2023-10-16' }) as typeof stripeInstance;
    return stripeInstance;
  } catch {
    return null;
  }
}

export async function createStripePaymentIntent(input: StripePaymentIntentInput): Promise<{ clientSecret: string; paymentIntentId: string } | null> {
  const stripe = getStripe();
  if (!stripe) {
    console.warn('Stripe não configurado');
    return null;
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount: input.amount,
      currency: input.currency ?? 'brl',
      receipt_email: input.customerEmail,
      metadata: input.metadata,
      automatic_payment_methods: { enabled: true },
    });
    return {
      clientSecret: intent.client_secret as string,
      paymentIntentId: intent.id as string,
    };
  } catch (e) {
    console.error('Stripe createPaymentIntent error:', e);
    return null;
  }
}

export function verifyStripeWebhook(payload: string, signature: string): unknown {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return null;
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return null;
  }
}
