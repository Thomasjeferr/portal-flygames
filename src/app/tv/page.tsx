'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

const TV_SESSION_HOURS = 24;

function normalizeCode(input: string): string {
  return input.replace(/\s|-/g, '').toUpperCase().slice(0, 6);
}

function TvPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeParam = searchParams.get('code') || searchParams.get('c') || '';
  const code = codeParam ? normalizeCode(codeParam) : '';

  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const effectiveCode = code || (manualCode ? normalizeCode(manualCode) : '');

  useEffect(() => {
    if (!effectiveCode) {
      setAuthChecked(true);
      return;
    }
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setIsLoggedIn(!!data?.user);
        setAuthChecked(true);
        if (!data?.user) {
          const redirect = `/tv?code=${encodeURIComponent(effectiveCode)}`;
          router.replace(`/entrar?redirect=${encodeURIComponent(redirect)}`);
        }
      })
      .catch(() => setAuthChecked(true));
  }, [effectiveCode, router]);

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalizeCode(manualCode);
    if (c.length !== 6) {
      setError('Digite o código de 6 caracteres exibido na TV.');
      return;
    }
    router.push(`/tv?code=${c}`);
  };

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveCode) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/tv/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: effectiveCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Não foi possível autorizar a TV.');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 flex items-center justify-center">
        <div className="w-full max-w-md text-center">
          <div className="bg-futvar-dark/95 border border-futvar-green/20 rounded-2xl p-8 shadow-2xl shadow-futvar-green/5">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-futvar-green/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-futvar-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">TV autorizada!</h1>
            <p className="text-futvar-light mb-6">
              Volte ao televisor — o catálogo já está disponível. Você pode fechar esta página.
            </p>
            <Link
              href="/"
              className="inline-block py-3 px-6 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors"
            >
              Ir para o início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!effectiveCode) {
    return (
      <div className="min-h-screen pt-28 pb-16 px-4 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="bg-futvar-dark/95 border border-futvar-green/20 rounded-2xl p-8 shadow-2xl shadow-futvar-green/5">
            <h1 className="text-2xl font-bold text-white mb-2">Autorizar TV</h1>
            <p className="text-futvar-light text-sm mb-6">
              Escaneie o QR code na tela da TV ou digite o código de 6 caracteres abaixo.
            </p>
            <form onSubmit={handleSubmitCode} className="space-y-4">
              {error && (
                <p className="text-amber-400 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
              <div>
                <label htmlFor="tv-code" className="block text-sm font-medium text-futvar-light mb-2">
                  Código exibido na TV
                </label>
                <input
                  id="tv-code"
                  type="text"
                  value={manualCode}
                  onChange={(e) => {
                    setManualCode(e.target.value);
                    setError('');
                  }}
                  placeholder="ABC-123"
                  maxLength={7}
                  className="w-full px-4 py-3 rounded bg-futvar-gray border border-futvar-green/20 text-white placeholder-futvar-light/60 focus:outline-none focus:ring-2 focus:ring-futvar-green focus:border-transparent text-center text-lg tracking-widest"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors"
              >
                Continuar
              </button>
            </form>
            <p className="mt-6 text-center text-futvar-light text-xs">
              <Link href="/" className="hover:text-white">
                ← Voltar para a página inicial
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!authChecked || !isLoggedIn) {
    return (
      <div className="min-h-screen pt-28 flex items-center justify-center">
        <p className="text-futvar-light">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-futvar-dark/95 border border-futvar-green/20 rounded-2xl p-8 shadow-2xl shadow-futvar-green/5">
          <h1 className="text-2xl font-bold text-white mb-2">Autorizar esta TV</h1>
          <p className="text-futvar-light text-sm mb-2">
            Você está autorizando uma Samsung TV (ou outro dispositivo) a assistir ao seu conteúdo.
          </p>
          <p className="text-futvar-light/80 text-xs mb-6">
            Válido por {TV_SESSION_HOURS} horas. Após esse período, será necessário escanear o QR code novamente na TV.
          </p>
          <p className="text-futvar-green font-mono text-center mb-6 text-xl tracking-widest">
            {effectiveCode.slice(0, 3)}-{effectiveCode.slice(3)}
          </p>
          <form onSubmit={handleAuthorize} className="space-y-4">
            {error && (
              <p className="text-amber-400 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Autorizando...' : 'Autorizar esta TV'}
            </button>
          </form>
          <p className="mt-6 text-center text-futvar-light text-xs">
            <Link href="/" className="hover:text-white">
              ← Cancelar e voltar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TvPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-28 flex items-center justify-center text-futvar-light">
          Carregando...
        </div>
      }
    >
      <TvPageContent />
    </Suspense>
  );
}
