'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

/**
 * Página de logout. Chama a API de saída e redireciona.
 * Uso: /sair ou /sair?redirect=/cadastro (encoded redirect na query)
 */
export default function SairPage() {
  const searchParams = useSearchParams();
  const [done, setDone] = useState(false);
  const redirectTo = searchParams.get('redirect') || '/';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      if (cancelled) return;
      setDone(true);
      window.location.href = redirectTo;
    })();
    return () => { cancelled = true; };
  }, [redirectTo]);

  return (
    <div className="min-h-screen bg-futvar-darker flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-futvar-light mb-4">Saindo da conta...</p>
        <p className="text-futvar-light/80 text-sm">
          Se não for redirecionado, <Link href={redirectTo} className="text-futvar-green hover:underline">clique aqui</Link>.
        </p>
      </div>
    </div>
  );
}
