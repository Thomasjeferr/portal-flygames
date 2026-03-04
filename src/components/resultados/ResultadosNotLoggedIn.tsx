'use client';

import Link from 'next/link';
import { useStoreApp } from '@/lib/StoreAppContext';

/** Bloco "faça login/cadastre-se" para resultados. No app lojas (?app=1) não mostra "Criar conta" nem "assinar". */
export function ResultadosNotLoggedIn({
  title,
  redirectPath,
  backHref,
  backLabel,
  storeAppMessage = 'Faça login para ver placares, estatísticas e súmulas oficiais aprovadas pelos times.',
}: {
  title: string;
  redirectPath: string;
  backHref: string;
  backLabel: string;
  storeAppMessage?: string;
}) {
  const isStoreApp = useStoreApp();

  if (isStoreApp) {
    return (
      <div className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker flex items-center justify-center">
        <div className="max-w-xl mx-auto text-center">
          <Link href={backHref} className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex gap-2 mb-8">
            {backLabel}
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">{title}</h1>
          <p className="text-futvar-light text-lg mb-8">
            {storeAppMessage}
          </p>
          <Link
            href={`/entrar?redirect=${encodeURIComponent(redirectPath)}`}
            className="inline-flex px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors"
          >
            Já tenho conta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker flex items-center justify-center">
      <div className="max-w-xl mx-auto text-center">
        <Link href={backHref} className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex gap-2 mb-8">
          {backLabel}
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">{title}</h1>
        <p className="text-futvar-light text-lg mb-2">
          <strong className="text-white">Cadastre-se grátis</strong> e veja placares, estatísticas e súmulas oficiais aprovadas pelos times.
        </p>
        <p className="text-futvar-light text-sm mb-8">
          É rápido, sem custo. Depois você pode assinar para assistir aos vídeos dos jogos.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={`/cadastro?redirect=${encodeURIComponent(redirectPath)}`}
            className="px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors"
          >
            Criar conta grátis
          </Link>
          <Link
            href={`/entrar?redirect=${encodeURIComponent(redirectPath)}`}
            className="px-6 py-3 rounded-lg border-2 border-futvar-green/60 text-futvar-green font-bold hover:bg-futvar-green/10 transition-colors"
          >
            Já tenho conta
          </Link>
        </div>
      </div>
    </div>
  );
}
