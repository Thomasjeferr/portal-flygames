'use client';

import Link from 'next/link';
import { useStoreApp } from '@/lib/StoreAppContext';

export function FooterNav() {
  const isStoreApp = useStoreApp();

  return (
    <div>
      <h3 className="text-lg font-bold text-white mb-3">Navegação</h3>
      <nav className="flex flex-col gap-2 text-sm text-futvar-light">
        <Link href="/" className="hover:text-futvar-green transition-colors">
          Início
        </Link>
        <Link href="/#jogos" className="hover:text-futvar-green transition-colors">
          Jogos
        </Link>
        <Link href="/#pre-estreia" className="hover:text-futvar-green transition-colors">
          Pré-estreia
        </Link>
        {!isStoreApp && (
          <>
            <Link href="/planos" className="hover:text-futvar-green transition-colors">
              Planos
            </Link>
            <Link href="/patrocinar" className="hover:text-futvar-green transition-colors">
              Seja Patrocinador
            </Link>
          </>
        )}
        <Link href="/parceiros" className="hover:text-futvar-green transition-colors">
          Programa de parceiros
        </Link>
        <Link href="/sobre-o-projeto" className="hover:text-futvar-green transition-colors">
          Sobre o projeto
        </Link>
        <Link href="/entrar" className="hover:text-futvar-green transition-colors">
          Entrar
        </Link>
        <Link href="/conta" className="hover:text-futvar-green transition-colors">
          Minha conta
        </Link>
      </nav>
    </div>
  );
}
