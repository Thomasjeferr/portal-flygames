'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AlterarSenhaPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao alterar senha');
        return;
      }
      router.push('/painel-time');
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-20 sm:pt-24 pb-16 px-4 min-h-screen bg-futvar-darker flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-8">
          <h1 className="text-xl font-bold text-white mb-2">Criar nova senha</h1>
          <p className="text-futvar-light text-sm mb-6">
            Por segurança, defina uma nova senha para acessar o painel do time.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-amber-400 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-futvar-light mb-2">
                Nova senha *
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded bg-futvar-gray border border-futvar-green/20 text-white focus:outline-none focus:ring-2 focus:ring-futvar-green"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-futvar-light mb-2">
                Confirmar nova senha *
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded bg-futvar-gray border border-futvar-green/20 text-white focus:outline-none focus:ring-2 focus:ring-futvar-green"
                placeholder="Repita a senha"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 px-4 py-3 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar e acessar o painel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
