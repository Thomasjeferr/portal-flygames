'use client';

import Link from 'next/link';
import { useStoreApp } from '@/lib/StoreAppContext';

interface Props {
  /** Conteúdo quando o usuário não tem acesso e NÃO está no app lojas (botões Ver planos, etc.) */
  children: React.ReactNode;
  /** Texto curto exibido no app lojas quando não tem acesso (sem botão/link) */
  message?: string;
  /** Se o usuário está logado (para mostrar botões diferentes no modo loja) */
  isLoggedIn?: boolean;
  className?: string;
}

/**
 * No app das lojas (?app=1): mostra mensagem + botões de login/voltar (sem CTAs de assinar/planos).
 * No site normal: mostra o conteúdo (children) com botões/links.
 */
export function StoreAppNoAccessMessage({ 
  children, 
  message = 'Este conteúdo não está disponível no momento.', 
  isLoggedIn = false,
  className = '' 
}: Props) {
  const isStoreApp = useStoreApp();

  if (isStoreApp) {
    return (
      <div className={`flex flex-col items-center gap-4 ${className}`}>
        <p className="text-center text-sm text-emerald-100/90">
          {isLoggedIn 
            ? 'Sua conta não permite acesso a esse conteúdo!' 
            : message
          }
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!isLoggedIn && (
            <Link
              href="/entrar"
              className="inline-flex items-center justify-center rounded-full bg-[#19d37a] px-6 py-3 text-sm font-bold text-[#02130b] shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-colors"
            >
              Fazer login
            </Link>
          )}
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border-2 border-emerald-400/60 px-6 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/10 transition-colors"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
