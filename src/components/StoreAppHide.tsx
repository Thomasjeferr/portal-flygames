'use client';

import { useStoreApp } from '@/lib/StoreAppContext';

/** No app lojas (?app=1): não renderiza os filhos (esconde CTAs de planos/assinar). */
export function StoreAppHide({ children }: { children: React.ReactNode }) {
  const isStoreApp = useStoreApp();
  if (isStoreApp) return null;
  return <>{children}</>;
}
