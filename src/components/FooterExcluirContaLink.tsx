'use client';

import Link from 'next/link';
import { useStoreApp } from '@/lib/StoreAppContext';

/** Link para /excluir-conta; no app lojas (?app=1) preserva ?app=1 na URL. */
export function FooterExcluirContaLink() {
  const isStoreApp = useStoreApp();
  return (
    <Link
      href={isStoreApp ? '/excluir-conta?app=1' : '/excluir-conta'}
      className="hover:text-futvar-green transition-colors"
    >
      Excluir conta
    </Link>
  );
}
