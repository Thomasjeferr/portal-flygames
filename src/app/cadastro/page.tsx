'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useRef, useEffect } from 'react';

function safeRedirect(path: string | null): string {
  if (!path || typeof path !== 'string') return '/';
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  return path;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirect'));
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const formTopRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error && formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao cadastrar');
        return;
      }
      if (data.needsVerification && data.user?.email) {
        const params = new URLSearchParams({ email: data.user.email });
        if (redirectTo !== '/') params.set('redirect', redirectTo);
        router.push(`/verificar-email?${params.toString()}`);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-futvar-dark/95 border border-futvar-green/20 rounded-2xl p-8 shadow-2xl shadow-futvar-green/5">
          <div ref={formTopRef}>
            <h1 className="text-3xl font-bold text-white mb-6">Cadastrar</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <p className="text-amber-400 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-futvar-light mb-2">
                Nome completo
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded bg-futvar-gray border border-futvar-green/20 text-white placeholder-futvar-light/60 focus:outline-none focus:ring-2 focus:ring-futvar-green focus:border-transparent"
                placeholder="Seu nome completo"
              />
            </div>
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
                className="w-full px-4 py-3 rounded bg-futvar-gray border border-futvar-green/20 text-white placeholder-futvar-light/60 focus:outline-none focus:ring-2 focus:ring-futvar-green focus:border-transparent"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-futvar-light mb-2">
                Senha (mín. 8 caracteres, com maiúscula, minúscula e número)
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-20 rounded bg-futvar-gray border border-futvar-green/20 text-white placeholder-futvar-light/60 focus:outline-none focus:ring-2 focus:ring-futvar-green focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-futvar-light hover:text-white"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>
          <p className="mt-6 text-center text-futvar-light text-sm">
            Já tem conta?{' '}
            <Link href={redirectTo === '/' ? '/entrar' : `/entrar?redirect=${encodeURIComponent(redirectTo)}`} className="text-white hover:underline">
              Entrar
            </Link>
          </p>
          <p className="mt-3 text-center text-futvar-light text-xs">
            <Link href="/" className="hover:text-white">
              ← Voltar para a página inicial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen pt-28 flex items-center justify-center text-futvar-light">Carregando...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
