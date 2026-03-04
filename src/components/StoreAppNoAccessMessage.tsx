'use client';

import { useStoreApp } from '@/lib/StoreAppContext';

interface Props {
  /** Conteúdo quando o usuário não tem acesso e NÃO está no app lojas (botões Ver planos, etc.) */
  children: React.ReactNode;
  /** Texto curto exibido no app lojas quando não tem acesso (sem botão/link) */
  message?: string;
  className?: string;
}

/**
 * No app das lojas (?app=1): mostra só uma mensagem neutra, sem CTAs de assinar/planos.
 * No site normal: mostra o conteúdo (children) com botões/links.
 */
export function StoreAppNoAccessMessage({ children, message = 'Conteúdo disponível para assinantes.', className = '' }: Props) {
  const isStoreApp = useStoreApp();

  if (isStoreApp) {
    return (
      <p className={`text-center text-sm text-emerald-100/90 ${className}`}>
        {message}
      </p>
    );
  }

  return <>{children}</>;
}
