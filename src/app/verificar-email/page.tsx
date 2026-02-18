'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function VerificarEmailContent() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') ?? '';
  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [status, setStatus] = useState<'form' | 'success' | 'error'>('form');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !code.trim()) return;
    setLoading(true);
    setMessage('');
    setStatus('form');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.error || 'Código inválido ou expirado.');
      }
    } catch {
      setStatus('error');
      setMessage('Erro ao verificar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setResendLoading(true);
    setMessage('');
    setStatus('form');
    try {
      const res = await fetch('/api/auth/send-verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.message) {
        setMessage(data.message);
      } else {
        setMessage(data.error || 'Erro ao reenviar código.');
      }
    } catch {
      setMessage('Erro ao reenviar. Tente novamente.');
    } finally {
      setResendLoading(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-futvar-dark/95 border border-futvar-green/20 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-white mb-4">E-mail verificado!</h1>
        <p className="text-futvar-light mb-6">{message}</p>
        <Link
          href="/entrar"
          className="inline-block w-full py-4 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light text-center"
        >
          Entrar
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-futvar-dark/95 border border-futvar-green/20 rounded-2xl p-8 shadow-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Verificar e-mail</h1>
      <p className="text-futvar-light text-sm mb-6">
        Digite o código de 6 dígitos que enviamos para seu e-mail.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {message && (
          <p
            className={`text-sm px-4 py-2 rounded ${
              status === 'error'
                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                : 'bg-green-500/10 border border-green-500/30 text-green-400'
            }`}
          >
            {message}
          </p>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-futvar-light mb-2">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded bg-futvar-gray border border-futvar-green/20 text-white placeholder-futvar-light/60 focus:outline-none focus:ring-2 focus:ring-futvar-green"
            placeholder="seu@email.com"
          />
        </div>
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-futvar-light mb-2">
            Código de 6 dígitos
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            className="w-full px-4 py-3 rounded bg-futvar-gray border border-futvar-green/20 text-white text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-futvar-green"
            placeholder="000000"
          />
        </div>
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full py-4 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Verificando...' : 'Verificar'}
        </button>
        <div className="text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || !email.trim()}
            className="text-sm text-futvar-light hover:text-white disabled:opacity-50"
          >
            {resendLoading ? 'Enviando...' : 'Não recebeu? Reenviar código'}
          </button>
        </div>
      </form>

      <p className="mt-6 text-center text-futvar-light text-sm">
        <Link href="/entrar" className="hover:text-white">
          ← Voltar para entrar
        </Link>
      </p>
    </div>
  );
}

export default function VerificarEmailPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="bg-futvar-dark/95 border border-futvar-green/20 rounded-2xl p-8 text-center text-futvar-light">
              Carregando...
            </div>
          }
        >
          <VerificarEmailContent />
        </Suspense>
      </div>
    </div>
  );
}
