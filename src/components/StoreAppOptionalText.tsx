'use client';

import { useStoreApp } from '@/lib/StoreAppContext';

/** No app lojas (?app=1) mostra storeApp; no site mostra normal. Evita menção a assinatura/compra para revisores. */
export function StoreAppOptionalText({
  normal,
  storeApp,
}: {
  normal: React.ReactNode;
  storeApp: React.ReactNode;
}) {
  const isStoreApp = useStoreApp();
  return <>{isStoreApp ? storeApp : normal}</>;
}
