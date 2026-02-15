'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Link inválido.');
      return;
    }
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.message) {
          setStatus('success');
          setMessage(data.message);
        } else {
          setStatus('error');
          setMessage(data.error || 'Link inválido ou expirado.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Erro ao verificar. Tente novamente.');
      });
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="bg-netflix-dark/80 border border-white/10 rounded-lg p-8 text-center">
        <p className="text-netflix-light">Verificando seu e-mail...</p>
      </div>
    );
  }

  return (
    <div className="bg-netflix-dark/80 border border-white/10 rounded-lg p-8">
      <h1 className="text-2xl font-bold text-white mb-4">
        {status === 'success' ? 'E-mail verificado!' : 'Erro'}
      </h1>
      <p className={status === 'success' ? 'text-green-400' : 'text-netflix-red'}>{message}</p>
      <Link
        href="/entrar"
        className="mt-6 inline-block px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600"
      >
        Ir para Entrar
      </Link>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link href="/" className="text-3xl font-bold text-netflix-red">
            FLY GAMES
          </Link>
        </div>
        <Suspense fallback={<div className="bg-netflix-dark/80 border border-white/10 rounded-lg p-8 text-netflix-light text-center">Carregando...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
