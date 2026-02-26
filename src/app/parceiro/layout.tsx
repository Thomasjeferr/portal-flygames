'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function ParceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'ok' | 'forbidden'>('loading');

  const check = useCallback(() => {
    fetch('/api/partner/me')
      .then((r) => {
        if (r.status === 403) setStatus('forbidden');
        else if (r.ok) setStatus('ok');
        else setStatus('forbidden');
      })
      .catch(() => setStatus('forbidden'));
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#1A202C] flex items-center justify-center">
        <p className="text-white/80">Carregando...</p>
      </div>
    );
  }

  if (status === 'forbidden') {
    return (
      <div className="min-h-screen bg-[#1A202C] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-white mb-2">Acesso restrito</h1>
          <p className="text-white/80 mb-4">
            Esta área é apenas para parceiros aprovados. Faça login com uma conta vinculada a um parceiro aprovado ou solicite sua parceria.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/entrar"
              className="px-4 py-2 rounded-lg bg-[#34D399] text-white font-semibold hover:bg-[#6EE7B7]"
            >
              Entrar
            </Link>
            <Link
              href="/parceiros"
              className="px-4 py-2 rounded-lg border border-white/30 text-white hover:bg-white/10"
            >
              Solicitar parceria
            </Link>
            <Link href="/" className="px-4 py-2 text-white/80 hover:text-white text-sm">
              Voltar ao início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const nav = [
    { href: '/parceiro/como-funciona', label: 'Como funciona' },
    { href: '/parceiro/link', label: 'Meu link' },
    { href: '/parceiro/indicacoes', label: 'Indicações' },
    { href: '/parceiro/comissoes', label: 'Comissões' },
  ];

  return (
    <div className="min-h-screen bg-[#1A202C] pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <h1 className="text-lg font-semibold text-white mb-4">Área do parceiro</h1>
        <nav className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === href
                  ? 'bg-[#34D399] text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
