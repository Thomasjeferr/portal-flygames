import { NextResponse } from 'next/server';
import { getPaymentConfig } from '@/lib/payment-config';

/** Retorna a chave pública do Stripe para uso no frontend (Elements). */
export async function GET() {
  try {
    const config = await getPaymentConfig();
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || config.stripePublishableKey || null;
    return NextResponse.json({ publishableKey: key });
  } catch {
    return NextResponse.json({ publishableKey: null });
  }
}
