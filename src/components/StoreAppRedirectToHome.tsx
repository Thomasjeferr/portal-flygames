'use client';

import { useStoreApp } from '@/lib/StoreAppContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** No app lojas (?app=1) redireciona para a home. Use em páginas de planos, cadastro, checkout. */
export function StoreAppRedirectToHome() {
  const isStoreApp = useStoreApp();
  const router = useRouter();

  useEffect(() => {
    if (isStoreApp) router.replace('/');
  }, [isStoreApp, router]);

  if (isStoreApp) return <div className="min-h-screen bg-futvar-darker" />;
  return null;
}

/** Envolve conteúdo de página server: no app lojas redireciona para home, senão renderiza children. */
export function StoreAppGate({ children }: { children: React.ReactNode }) {
  const isStoreApp = useStoreApp();
  if (isStoreApp) return <StoreAppRedirectToHome />;
  return <>{children}</>;
}
