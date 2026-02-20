/**
 * Integração Stripe (cartão e assinaturas recorrentes).
 * Variáveis: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
 */

export interface StripePaymentIntentInput {
  amount: number; // centavos
  currency?: string;
  customerEmail?: string;
  metadata: Record<string, string>; // purchaseId/userId/planId ou sponsorOrderId
}

export interface StripeSubscriptionInput {
  customerEmail: string;
  userId: string;
  planId: string;
  planName: string;
  amountCents: number;
  /** 'mensal' -> month, 'anual' -> year */
  periodicity: string;
  metadata?: Record<string, string>;
}

/** Stripe instance (typed minimally for what we use). */
export interface StripeClient {
  paymentIntents: { create: (opts: unknown) => Promise<{ client_secret: string; id: string; invoice?: string }> };
  customers: { list: (opts: { email: string }) => Promise<{ data: { id: string }[] }>; create: (opts: { email: string }) => Promise<{ id: string }> };
  subscriptions: {
    create: (opts: {
      customer: string;
      items: { price_data: { currency: string; unit_amount: number; recurring: { interval: 'month' | 'year' }; product_data: { name: string } } }[];
      payment_behavior?: string;
      metadata: Record<string, string>;
      expand?: string[];
    }) => Promise<{
      id: string;
      latest_invoice?: string | { payment_intent?: { client_secret: string; id: string }; id: string };
    }>;
    retrieve: (id: string, opts?: { expand?: string[] }) => Promise<{ metadata: Record<string, string> }>;
  };
  invoices: { retrieve: (id: string) => Promise<{ id: string; subscription: string; amount_paid: number; billing_reason?: string }> };
  webhooks: { constructEvent: (payload: string, sig: string, secret: string) => unknown };
}

let stripeInstance: StripeClient | null = null;

async function getStripeKey(): Promise<string | null> {
  const envKey = process.env.STRIPE_SECRET_KEY;
  if (envKey) return envKey;
  const { getPaymentConfig } = await import('@/lib/payment-config');
  const config = await getPaymentConfig();
  return config.stripeSecretKey;
}

/** Retorna a instância Stripe (para uso em webhooks que precisam de subscriptions.retrieve, etc.). */
export async function getStripe(): Promise<StripeClient | null> {
  if (stripeInstance) return stripeInstance;
  const key = await getStripeKey();
  if (!key) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = require('stripe');
    stripeInstance = new Stripe(key, { apiVersion: '2023-10-16' }) as unknown as StripeClient;
    return stripeInstance;
  } catch {
    return null;
  }
}

const PERIODICITY_TO_INTERVAL: Record<string, 'month' | 'year'> = {
  mensal: 'month',
  anual: 'year',
};

/**
 * Cria uma assinatura recorrente no Stripe. O primeiro pagamento é cobrado via invoice;
 * o front confirma com o client_secret do payment_intent da primeira invoice.
 * Renovações futuras são cobradas automaticamente; use o webhook invoice.paid com
 * user.favoriteTeamId para repasse ao time.
 */
export async function createStripeSubscription(input: StripeSubscriptionInput): Promise<{ clientSecret: string; subscriptionId: string } | null> {
  const stripe = await getStripe();
  if (!stripe) {
    console.warn('Stripe não configurado');
    return null;
  }

  const interval = PERIODICITY_TO_INTERVAL[input.periodicity] ?? 'month';

  try {
    let customerId: string;
    const list = await stripe.customers.list({ email: input.customerEmail });
    if (list.data.length > 0) {
      customerId = list.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email: input.customerEmail });
      customerId = customer.id;
    }

    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price_data: {
            currency: 'brl',
            unit_amount: input.amountCents,
            recurring: { interval },
            product_data: { name: input.planName },
          },
        },
      ],
      payment_behavior: 'default_incomplete',
      metadata: {
        userId: input.userId,
        planId: input.planId,
        ...input.metadata,
      },
      expand: ['latest_invoice.payment_intent'],
    });

    const latestInvoice = sub.latest_invoice;
    const paymentIntent =
      typeof latestInvoice === 'object' && latestInvoice?.payment_intent
        ? typeof latestInvoice.payment_intent === 'object'
          ? latestInvoice.payment_intent
          : null
        : null;
    const clientSecret = paymentIntent?.client_secret ?? null;

    if (!clientSecret) {
      console.error('Stripe subscription created but no payment_intent client_secret');
      return null;
    }

    return {
      clientSecret,
      subscriptionId: sub.id,
    };
  } catch (e) {
    console.error('Stripe createSubscription error:', e);
    return null;
  }
}

export async function createStripePaymentIntent(input: StripePaymentIntentInput): Promise<{ clientSecret: string; paymentIntentId: string } | null> {
  const stripe = await getStripe();
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

export async function verifyStripeWebhook(payload: string, signature: string): Promise<unknown> {
  const stripe = await getStripe();
  let secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    const { getPaymentConfig } = await import('@/lib/payment-config');
    const config = await getPaymentConfig();
    secret = config.stripeWebhookSecret ?? undefined;
  }
  if (!stripe || !secret) return null;
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return null;
  }
}
