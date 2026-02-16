'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      let data;
      try {
        data = await res.json();
      } catch {
        setError('Servidor com erro. Pare o npm run dev (Ctrl+C), rode npx prisma generate e inicie de novo.');
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Erro ao entrar');
        return;
      }
      if (data.user?.role !== 'admin') {
        setError('Acesso restrito a administradores.');
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('Erro de conexão. Verifique se o servidor está rodando (npm run dev).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-netflix-red">Fly Games</span>
          <span className="text-xl text-netflix-light ml-2">Admin</span>
        </div>
        <div className="bg-netflix-dark border border-white/10 rounded-lg p-8">
          <h1 className="text-2xl font-bold text-white mb-6">Login administrativo</h1>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
                {error}
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
                placeholder="admin@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-netflix-light mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-20 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-netflix-light hover:text-white"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <p className="mt-6 text-center text-netflix-light text-sm">
            <Link href="/" className="text-white hover:underline">
              Voltar ao site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
