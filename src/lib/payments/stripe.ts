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

/** Patrocínio: assinatura recorrente com billingPeriod (monthly | quarterly | yearly) */
export interface StripeSponsorSubscriptionInput {
  customerEmail: string;
  sponsorOrderId: string;
  planName: string;
  amountCents: number;
  billingPeriod: string;
}

/** Stripe instance (typed minimally for what we use). */
export interface StripeClient {
  paymentIntents: { create: (opts: unknown) => Promise<{ client_secret: string; id: string; invoice?: string }> };
  customers: { list: (opts: { email: string }) => Promise<{ data: { id: string }[] }>; create: (opts: { email: string }) => Promise<{ id: string }> };
  products: { create: (opts: { name: string }) => Promise<{ id: string }> };
  subscriptions: {
    create: (opts: {
      customer: string;
      items: { price_data: { currency: string; unit_amount: number; recurring: { interval: 'month' | 'year'; interval_count?: number }; product: string } }[];
      payment_behavior?: string;
      metadata: Record<string, string>;
      expand?: string[];
    }) => Promise<{
      id: string;
      latest_invoice?: string | { payment_intent?: { client_secret: string; id: string }; id: string };
    }>;
    retrieve: (id: string, opts?: { expand?: string[] }) => Promise<{ metadata: Record<string, string> }>;
    update: (id: string, opts: { cancel_at_period_end?: boolean }) => Promise<unknown>;
    cancel: (id: string) => Promise<unknown>;
  };
  invoices: {
    retrieve: (id: string, opts?: { expand?: string[] }) => Promise<{ id: string; subscription: string | { id: string }; amount_paid?: number; lines?: { data?: Array<{ metadata?: Record<string, string> }> } }>;
  };
  webhooks: { constructEvent: (payload: string, sig: string, secret: string) => unknown };
}

let stripeInstance: StripeClient | null = null;

async function getStripeKey(): Promise<string | null> {
  const envKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (envKey) return envKey;
  const { getPaymentConfig } = await import('@/lib/payment-config');
  const config = await getPaymentConfig();
  const key = config.stripeSecretKey?.trim() ?? null;
  return key || null;
}

/** Retorna a instância Stripe (para uso em webhooks que precisam de subscriptions.retrieve, etc.). */
export async function getStripe(): Promise<StripeClient | null> {
  if (stripeInstance) return stripeInstance;
  const key = await getStripeKey();
  if (!key) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Stripe = require('stripe');
    stripeInstance = new Stripe(key.trim(), { apiVersion: '2023-10-16' }) as unknown as StripeClient;
    return stripeInstance;
  } catch (e) {
    console.error('Stripe init error (check secret key):', e instanceof Error ? e.message : e);
    return null;
  }
}

/** Verifica se a chave secreta do Stripe está configurada (env ou Admin > Pagamentos). */
export async function isStripeConfigured(): Promise<boolean> {
  const key = await getStripeKey();
  return !!key;
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

    const product = await stripe.products.create({ name: input.planName });

    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price_data: {
            currency: 'brl',
            unit_amount: input.amountCents,
            recurring: { interval },
            product: product.id,
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
    const msg = e && typeof e === 'object' && 'message' in e ? (e as { message: string }).message : String(e);
    console.error('Stripe createSubscription error:', msg);
    return null;
  }
}

/** Patrocínio: monthly -> month/1, quarterly -> month/3, yearly -> year/1 */
const BILLING_PERIOD_STRIPE: Record<string, { interval: 'month' | 'year'; interval_count: number }> = {
  monthly: { interval: 'month', interval_count: 1 },
  quarterly: { interval: 'month', interval_count: 3 },
  yearly: { interval: 'year', interval_count: 1 },
};

/**
 * Cria assinatura recorrente para patrocínio. Metadata: sponsorOrderId, type: 'sponsor'.
 * Webhook invoice.paid cria/atualiza Sponsor; subscription.deleted revoga acesso (isActive = false).
 */
export async function createStripeSponsorSubscription(input: StripeSponsorSubscriptionInput): Promise<{ clientSecret: string; subscriptionId: string } | null> {
  const stripe = await getStripe();
  if (!stripe) {
    console.warn('Stripe não configurado');
    return null;
  }

  const recurring = BILLING_PERIOD_STRIPE[input.billingPeriod.toLowerCase()] ?? BILLING_PERIOD_STRIPE.monthly;

  try {
    let customerId: string;
    const list = await stripe.customers.list({ email: input.customerEmail });
    if (list.data.length > 0) {
      customerId = list.data[0].id;
    } else {
      const customer = await stripe.customers.create({ email: input.customerEmail });
      customerId = customer.id;
    }

    const product = await stripe.products.create({ name: input.planName });

    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price_data: {
            currency: 'brl',
            unit_amount: input.amountCents,
            recurring: { interval: recurring.interval, interval_count: recurring.interval_count },
            product: product.id,
          },
        },
      ],
      payment_behavior: 'default_incomplete',
      metadata: {
        sponsorOrderId: input.sponsorOrderId,
        type: 'sponsor',
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
      console.error('Stripe sponsor subscription created but no payment_intent client_secret');
      return null;
    }

    return {
      clientSecret,
      subscriptionId: sub.id,
    };
  } catch (e) {
    const msg = e && typeof e === 'object' && 'message' in e ? (e as { message: string }).message : String(e);
    console.error('Stripe createStripeSponsorSubscription error:', msg);
    return null;
  }
}

/** Cancela assinatura no Stripe imediatamente (para troca de plano: nova assinatura já foi ativada). */
export async function cancelStripeSubscription(subscriptionId: string): Promise<boolean> {
  const stripe = await getStripe();
  if (!stripe) return false;
  try {
    await stripe.subscriptions.cancel(subscriptionId);
    return true;
  } catch (e) {
    console.error('Stripe cancelSubscription error:', e);
    return false;
  }
}

/** Marca assinatura para cancelar ao fim do período (usuário mantém acesso até endDate). */
export async function cancelStripeSubscriptionAtPeriodEnd(subscriptionId: string): Promise<boolean> {
  const stripe = await getStripe();
  if (!stripe) return false;
  try {
    await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    return true;
  } catch (e) {
    console.error('Stripe cancelAtPeriodEnd error:', e);
    return false;
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
  const { getPaymentConfig, clearPaymentConfigCache } = await import('@/lib/payment-config');
  let config = await getPaymentConfig();
  const hasStripeKey = !!(process.env.STRIPE_SECRET_KEY?.trim() || config.stripeSecretKey?.trim());
  const hasWebhookSecret = !!(process.env.STRIPE_WEBHOOK_SECRET?.trim() || config.stripeWebhookSecret?.trim());
  if (!hasStripeKey || !hasWebhookSecret) {
    clearPaymentConfigCache();
    config = await getPaymentConfig();
  }
  let secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() || config.stripeWebhookSecret?.trim() || undefined;
  const stripe = await getStripe();
  if (!stripe) {
    console.warn('[Stripe] verifyStripeWebhook: Stripe não configurado (chave secreta ausente em env ou Admin > Pagamentos)');
    return null;
  }
  if (!secret) {
    console.warn('[Stripe] verifyStripeWebhook: segredo do webhook ausente. Configure em Admin > Pagamentos (Stripe) ou em STRIPE_WEBHOOK_SECRET. Use o "Segredo da assinatura" do destino em https://dashboard.stripe.com/webhooks.');
    return null;
  }
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (e) {
    console.warn('[Stripe] verifyStripeWebhook: assinatura inválida ou segredo incorreto', e instanceof Error ? e.message : e);
    return null;
  }
}
