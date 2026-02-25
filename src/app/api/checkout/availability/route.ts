import { NextResponse } from 'next/server';
import { getPaymentConfig, clearPaymentConfigCache } from '@/lib/payment-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Retorna quais métodos de pagamento estão configurados (sem expor chaves).
 * Considera variáveis de ambiente e Admin > Pagamentos.
 */
export async function GET() {
  clearPaymentConfigCache();
  const config = await getPaymentConfig();
  const pix =
    !!(process.env.WOOVI_API_KEY?.trim() || (config.wooviApiKey && config.wooviApiKey.trim()));
  const card =
    !!(process.env.STRIPE_SECRET_KEY?.trim() || (config.stripeSecretKey && config.stripeSecretKey.trim()));
  const res = NextResponse.json({ pix, card });
  res.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return res;
}
