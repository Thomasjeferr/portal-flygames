'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Subscription {
  id: string;
  active: boolean;
  startDate: string;
  endDate: string;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  subscription: Subscription | null;
  paidPurchasesCount?: number;
}

export default function AdminUserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subscriptionAction, setSubscriptionAction] = useState<'activate' | 'deactivate' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', role: 'user' as 'user' | 'admin' });
  const [months, setMonths] = useState(1);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const fetchUser = async () => {
    const res = await fetch(`/api/admin/users/${id}`);
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      setForm({ name: data.name || '', role: data.role });
    } else {
      setError('Usuário não encontrado');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUser();
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim() || null,
          role: form.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao atualizar');
        return;
      }
      setUser(data);
    } catch {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const handleActivateSubscription = async () => {
    setSubscriptionAction('activate');
    try {
      const res = await fetch('/api/subscription/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id, months }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao ativar assinatura');
        return;
      }
      await fetchUser();
    } catch {
      setError('Erro de conexão');
    } finally {
      setSubscriptionAction(null);
    }
  };

  const handleDeactivateSubscription = async () => {
    if (!confirm('Desativar a assinatura deste usuário?')) return;
    setSubscriptionAction('deactivate');
    try {
      const res = await fetch('/api/admin/subscription/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao desativar');
        return;
      }
      await fetchUser();
    } catch {
      setError('Erro de conexão');
    } finally {
      setSubscriptionAction(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao excluir');
        return;
      }
      router.push('/admin/usuarios');
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const isSubscriptionActive = user?.subscription
    ? user.subscription.active && new Date(user.subscription.endDate) >= new Date()
    : false;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-netflix-light">Carregando...</p>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-netflix-red mb-4">{error}</p>
        <Link href="/admin/usuarios" className="text-netflix-light hover:text-white">
          ← Voltar aos usuários
        </Link>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/admin/usuarios" className="text-netflix-light hover:text-white text-sm">
          ← Voltar aos usuários
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-white mb-6">Gerenciar usuário</h1>

      {error && (
        <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2 mb-6">
          {error}
        </p>
      )}

      <div className="space-y-6">
        {/* Dados do usuário */}
        <div className="bg-netflix-dark border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Dados cadastrais</h2>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-netflix-gray flex items-center justify-center text-white font-bold text-2xl">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-white">{user.name || 'Sem nome'}</p>
              <p className="text-sm text-netflix-light">{user.email}</p>
              <p className="text-xs text-netflix-light mt-1">
                Cadastro em {formatDate(user.createdAt)}
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-netflix-light mb-2">Nome</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Nome do usuário"
                className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-netflix-light mb-2">Perfil</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'user' | 'admin' }))}
                className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </form>
        </div>

        {/* Assinatura */}
        <div className="bg-netflix-dark border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Assinatura</h2>
          {user.subscription ? (
            <div className="space-y-4">
              <div
                className={`inline-flex px-3 py-1 rounded text-sm font-medium ${
                  isSubscriptionActive ? 'bg-green-900/50 text-green-300' : 'bg-red-900/30 text-red-300'
                }`}
              >
                {isSubscriptionActive ? 'Assinatura ativa' : 'Assinatura inativa'}
              </div>
              <p className="text-sm text-netflix-light">
                Início: {formatDate(user.subscription.startDate)} • Fim:{' '}
                {formatDate(user.subscription.endDate)}
              </p>
              <div className="flex flex-wrap gap-3">
                {isSubscriptionActive ? (
                  <button
                    onClick={handleDeactivateSubscription}
                    disabled={subscriptionAction !== null}
                    className="px-4 py-2 rounded bg-red-900/50 text-red-300 text-sm hover:bg-red-900 disabled:opacity-50"
                  >
                    {subscriptionAction === 'deactivate' ? 'Desativando...' : 'Desativar assinatura'}
                  </button>
                ) : (
                  <>
                    <select
                      value={months}
                      onChange={(e) => setMonths(Number(e.target.value))}
                      className="px-3 py-2 rounded bg-netflix-gray border border-white/20 text-white text-sm"
                    >
                      {[1, 3, 6, 12].map((m) => (
                        <option key={m} value={m}>
                          {m} {m === 1 ? 'mês' : 'meses'}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleActivateSubscription}
                      disabled={subscriptionAction !== null}
                      className="px-4 py-2 rounded bg-green-900/50 text-green-300 text-sm hover:bg-green-900 disabled:opacity-50"
                    >
                      {subscriptionAction === 'activate' ? 'Ativando...' : 'Ativar assinatura'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-netflix-light text-sm">Usuário sem assinatura cadastrada.</p>
              {(user.paidPurchasesCount ?? 0) > 0 && (
                <p className="text-green-300 text-sm">
                  {user.paidPurchasesCount} compra(s) avulsa(s) paga(s) (acesso a jogo(s)).
                </p>
              )}
              <div className="flex items-center gap-3">
                <select
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="px-3 py-2 rounded bg-netflix-gray border border-white/20 text-white text-sm"
                >
                  {[1, 3, 6, 12].map((m) => (
                    <option key={m} value={m}>
                      {m} {m === 1 ? 'mês' : 'meses'}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleActivateSubscription}
                  disabled={subscriptionAction !== null}
                  className="px-4 py-2 rounded bg-green-900/50 text-green-300 text-sm hover:bg-green-900 disabled:opacity-50"
                >
                  {subscriptionAction === 'activate' ? 'Ativando...' : 'Ativar assinatura'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Excluir */}
        <div className="bg-netflix-dark border border-red-900/30 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-300 mb-2">Zona de perigo</h2>
          <p className="text-sm text-netflix-light mb-4">
            {currentUserId === user.id
              ? 'Você não pode excluir sua própria conta.'
              : 'Excluir este usuário remove todos os dados, sessões e assinatura de forma permanente.'}
          </p>
          {currentUserId !== user.id && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded bg-red-900/50 text-red-300 text-sm hover:bg-red-900 disabled:opacity-50"
            >
              {deleting ? 'Excluindo...' : 'Excluir usuário'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
