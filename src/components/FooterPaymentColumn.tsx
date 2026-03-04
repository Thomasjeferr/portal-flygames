'use client';

import { useStoreApp } from '@/lib/StoreAppContext';

/** No app lojas (?app=1) não exibe a coluna de formas de pagamento (evita menção a Stripe/Woovi para revisores). */
export function FooterPaymentColumn({ children }: { children: React.ReactNode }) {
  const isStoreApp = useStoreApp();
  if (isStoreApp) return null;
  return <>{children}</>;
}
