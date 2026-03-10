'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const CADASTRAR_LINK = '/times/cadastrar';

export function ParaTimesCadastroCTA() {
  const [status, setStatus] = useState<'loading' | 'guest' | 'already_responsible' | 'can_register'>('loading');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          setStatus('guest');
          return;
        }
        if (data.isTeamManager) {
          setStatus('already_responsible');
          return;
        }
        setStatus('can_register');
      })
      .catch(() => setStatus('guest'));
  }, []);

  if (status === 'loading') {
    return (
      <div className="rounded-2xl border border-futvar-green/30 bg-futvar-dark p-6 mb-8">
        <p className="text-futvar-light text-sm">Carregando...</p>
      </div>
    );
  }

  if (status === 'already_responsible') {
    return (
      <div className="rounded-2xl border border-futvar-green/30 bg-futvar-dark p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-2">Você já é responsável por um time</h2>
        <p className="text-futvar-light text-sm mb-4">
          Esta conta já está vinculada a um time. Cada e-mail pode cadastrar apenas um time. Acesse a Área do time para gerenciar comissões e elenco.
        </p>
        <Link
          href="/painel-time"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light transition-colors"
        >
          Ir para a Área do time
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-futvar-green/30 bg-futvar-dark p-6 mb-8">
      <h2 className="text-lg font-semibold text-white mb-2">Cadastrar meu time</h2>
      <p className="text-futvar-light text-sm mb-4">
        Você é responsável por um time? Faça login (ou crie uma conta), verifique seu e-mail e acesse o formulário de cadastro.
      </p>
      <p className="text-amber-200/90 text-sm mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
        <strong>Dica:</strong> Prefira criar uma conta com o e-mail do time (ex: contato@time.com). Assim seu e-mail pessoal continua livre para você usar como torcedor ou patrocinador.
      </p>
      <Link
        href={CADASTRAR_LINK}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light transition-colors"
      >
        Ir para cadastro do time
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
