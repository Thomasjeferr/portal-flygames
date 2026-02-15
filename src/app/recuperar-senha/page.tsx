'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isResetMode = !!token;

  const handleRequestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMessage(data.message || 'Verifique seu e-mail.');
      if (data.devResetLink) setMessage(`Link (dev): ${data.devResetLink}`);
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao alterar senha');
        return;
      }
      setMessage('Senha alterada. Redirecionando...');
      setTimeout(() => {
        window.location.href = '/entrar';
      }, 1500);
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-netflix-dark/80 border border-white/10 rounded-lg p-8 shadow-2xl">
      <h1 className="text-3xl font-bold text-white mb-6">
        {isResetMode ? 'Nova senha' : 'Recuperar senha'}
      </h1>

      {isResetMode ? (
        <form onSubmit={handleResetPassword} className="space-y-5">
          {error && (
            <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
              {error}
            </p>
          )}
          {message && (
            <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded px-3 py-2">
              {message}
            </p>
          )}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-netflix-light mb-2">
              Nova senha (mín. 8 caracteres, com maiúscula, minúscula e número)
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-netflix-light mb-2">
              Confirmar senha
            </label>
            <input
              id="confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Alterando...' : 'Alterar senha'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRequestLink} className="space-y-5">
          {error && (
            <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
              {error}
            </p>
          )}
          {message && (
            <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded px-3 py-2 break-all">
              {message}
            </p>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-netflix-light mb-2">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
              placeholder="seu@email.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-netflix-light text-sm">
        <Link href="/entrar" className="text-white hover:underline">
          Voltar para entrar
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen pt-28 pb-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link href="/" className="text-3xl font-bold text-netflix-red">
            FLY GAMES
          </Link>
        </div>
        <Suspense fallback={<div className="bg-netflix-dark/80 border border-white/10 rounded-lg p-8 text-netflix-light text-center">Carregando...</div>}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
