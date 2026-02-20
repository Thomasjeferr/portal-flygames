'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { TeamPicker, TeamDisplay } from '@/components/account/TeamPicker';
import type { TeamOption } from '@/components/account/TeamPicker';

interface AccountUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified?: boolean;
  createdAt?: string;
  favoriteTeamId: string | null;
  favoriteTeam: TeamOption | null;
}

interface PlanInfo {
  id: string;
  name: string;
  periodicity?: string;
  price?: number;
}

interface SubscriptionData {
  id: string;
  active: boolean;
  startDate: string;
  endDate: string;
  plan: PlanInfo | null;
  paymentGateway?: string | null;
}

interface PurchaseItem {
  id: string;
  purchasedAt: string;
  paymentStatus: string;
  expiresAt: string | null;
  plan: { name: string; type: string; price?: number; teamPayoutPercent?: number };
  game: { id: string; title: string; slug: string } | null;
  team: TeamOption | null;
}

interface AccountData {
  user: AccountUser;
  isTeamManager: boolean;
  subscription: SubscriptionData | null;
  purchases: PurchaseItem[];
}

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-futvar-dark p-6 animate-pulse ${className}`}>
      <div className="h-6 w-40 bg-white/10 rounded mb-4" />
      <div className="h-4 w-full max-w-sm bg-white/10 rounded mb-3" />
      <div className="h-4 w-3/4 bg-white/10 rounded" />
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPrice(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export default function ContaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AccountData | null>(null);

  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [favoriteTeam, setFavoriteTeam] = useState<TeamOption | null>(null);
  const [savingFavoriteTeam, setSavingFavoriteTeam] = useState(false);
  const [favoriteTeamToast, setFavoriteTeamToast] = useState<string | null>(null);
  const [showTeamPicker, setShowTeamPicker] = useState(false);

  const [savingTeamId, setSavingTeamId] = useState<string | null>(null);
  const [teamsForPurchase, setTeamsForPurchase] = useState<TeamOption[]>([]);

  const loadAccount = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/account', { credentials: 'include' });
      if (res.status === 401) {
        router.replace('/entrar?redirect=/conta');
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Erro ao carregar conta.');
        return;
      }
      const json = await res.json();
      setData(json);
      setProfileForm({ name: json.user?.name ?? '', email: json.user?.email ?? '' });
      setFavoriteTeam(json.user?.favoriteTeam ?? null);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    if (data?.purchases?.length && teamsForPurchase.length === 0) {
      fetch('/api/public/teams', { cache: 'no-store' })
        .then((r) => r.json())
        .then((list) => setTeamsForPurchase(Array.isArray(list) ? list : []))
        .catch(() => {});
    }
  }, [data?.purchases?.length, teamsForPurchase.length]);

  useEffect(() => {
    if (!favoriteTeamToast) return;
    const t = setTimeout(() => setFavoriteTeamToast(null), 4000);
    return () => clearTimeout(t);
  }, [favoriteTeamToast]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setSavingProfile(true);
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileForm.name.trim() || undefined,
          email: profileForm.email.trim() || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setProfileMessage({ type: 'error', text: result.error || 'Não foi possível salvar.' });
        return;
      }
      if (result.user && data?.user) {
        setData((prev) => prev ? { ...prev, user: { ...prev.user, ...result.user } } : null);
        setProfileForm({ name: result.user.name ?? '', email: result.user.email ?? '' });
      }
      const msg =
        result.user?.emailVerified === false
          ? (result.message ?? 'Dados salvos.') + ' Verifique seu novo e-mail para ativar a conta.'
          : result.message ?? 'Dados salvos.';
      setProfileMessage({ type: 'success', text: msg });
    } catch {
      setProfileMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveFavoriteTeam = async () => {
    if (!favoriteTeam) return;
    setSavingFavoriteTeam(true);
    try {
      const res = await fetch('/api/account/favorite-team', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: favoriteTeam.id }),
      });
      const result = await res.json();
      if (!res.ok) {
        setProfileMessage({ type: 'error', text: result.error || 'Não foi possível salvar o time.' });
        return;
      }
      setFavoriteTeamToast('Time do coração atualizado.');
      setShowTeamPicker(false);
      if (data?.user) {
        setData((prev) =>
          prev
            ? { ...prev, user: { ...prev.user, favoriteTeamId: result.favoriteTeamId, favoriteTeam: result.favoriteTeam ?? favoriteTeam } }
            : null
        );
      }
    } catch {
      setProfileMessage({ type: 'error', text: 'Erro de conexão ao salvar o time.' });
    } finally {
      setSavingFavoriteTeam(false);
    }
  };

  const handleChooseTeamForPurchase = async (purchaseId: string, teamId: string) => {
    if (!teamId) return;
    setSavingTeamId(purchaseId);
    try {
      const res = await fetch(`/api/me/purchases/${purchaseId}/choose-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });
      const result = await res.json();
      if (!res.ok) {
        setProfileMessage({ type: 'error', text: result.error || 'Não foi possível salvar o time desta compra.' });
        return;
      }
      const chosen = teamsForPurchase.find((t) => t.id === teamId) ?? null;
      setData((prev) =>
        prev
          ? {
              ...prev,
              purchases: prev.purchases.map((p) => (p.id === purchaseId ? { ...p, team: chosen } : p)),
            }
          : null
      );
    } catch {
      setProfileMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setSavingTeamId(null);
    }
  };

  const canChooseTeam = (p: PurchaseItem) => {
    const payoutPercent = p.plan?.teamPayoutPercent ?? 0;
    return p.paymentStatus === 'paid' && payoutPercent > 0 && !p.team;
  };

  if (loading) {
    return (
      <div className="pt-24 pb-16 px-4 lg:px-12 min-h-screen bg-futvar-darker">
        <div className="max-w-5xl mx-auto">
          <div className="h-9 w-56 bg-white/10 rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-40 bg-white/10 rounded animate-pulse mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard className="md:col-span-2" />
            <SkeletonCard className="md:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-futvar-dark p-8 text-center">
          <p className="text-futvar-light mb-4">{error}</p>
          <button
            type="button"
            onClick={() => loadAccount()}
            className="px-4 py-2 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const user = data!.user;
  const subscription = data!.subscription;
  const purchases = data!.purchases ?? [];
  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'Usuário';
  const subscriptionActive = !!subscription?.active && new Date(subscription.endDate) >= new Date();

  return (
    <div className="pt-24 pb-16 px-4 lg:px-12 min-h-screen bg-futvar-darker">
      {favoriteTeamToast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg bg-futvar-green text-futvar-darker font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {favoriteTeamToast}
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">Minha conta</h1>
          <p className="text-futvar-light mt-1">Olá, {displayName}!</p>
        </header>

        {profileMessage && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              profileMessage.type === 'success'
                ? 'bg-green-900/20 text-green-300 border-green-500/30'
                : 'bg-red-900/20 text-red-300 border-red-500/30'
            }`}
          >
            <p>{profileMessage.text}</p>
            {profileMessage.type === 'success' && profileMessage.text.includes('Verifique seu novo e-mail') && (
              <Link
                href={`/verificar-email?email=${encodeURIComponent(profileForm.email || user?.email || '')}`}
                className="inline-block mt-2 font-medium underline hover:no-underline"
              >
                Verificar e-mail agora
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Perfil */}
          <section className="rounded-2xl border border-white/10 bg-futvar-dark p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Perfil</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label htmlFor="profile-name" className="block text-sm text-futvar-light mb-1">
                  Nome
                </label>
                <input
                  id="profile-name"
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg bg-futvar-darker border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-futvar-green"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label htmlFor="profile-email" className="block text-sm text-futvar-light mb-1">
                  E-mail
                </label>
                <input
                  id="profile-email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg bg-futvar-darker border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-futvar-green"
                  placeholder="seu@email.com"
                />
                <p className="text-xs text-futvar-light mt-1">Se alterar o e-mail, você receberá um código para verificar o novo endereço.</p>
              </div>
              {user?.createdAt && (
                <p className="text-xs text-futvar-light">Membro desde: {formatDate(user.createdAt)}</p>
              )}
              {user?.id && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-futvar-light">ID: {user.id.slice(0, 12)}…</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(user.id);
                      setProfileMessage({ type: 'success', text: 'ID copiado.' });
                      setTimeout(() => setProfileMessage(null), 2000);
                    }}
                    className="text-xs text-futvar-green hover:underline"
                  >
                    Copiar
                  </button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-4 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light disabled:opacity-50"
                >
                  {savingProfile ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <Link href="/recuperar-senha" className="text-futvar-green hover:underline font-medium text-sm">
                  Alterar senha
                </Link>
              </div>
            </form>
          </section>

          {/* Assinatura / Plano */}
          <section className="rounded-2xl border border-white/10 bg-futvar-dark p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4">Assinatura / Plano</h2>
            {subscription && subscription.plan ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      subscriptionActive ? 'bg-green-900/40 text-green-300' : 'bg-amber-900/40 text-amber-300'
                    }`}
                  >
                    {subscriptionActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <p className="text-white font-medium">{subscription.plan.name}</p>
                {subscription.plan.price != null && (
                  <p className="text-futvar-light">Valor: {formatPrice(subscription.plan.price)}</p>
                )}
                <p className="text-futvar-light text-sm">
                  Renovação em: {formatDate(subscription.endDate)}
                </p>
                {!subscriptionActive && (
                  <Link
                    href="/planos"
                    className="inline-flex mt-2 px-4 py-2 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light"
                  >
                    Ver planos
                  </Link>
                )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Link href="/planos" className="text-sm text-futvar-green hover:underline">
                    Ver planos
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-6 text-center">
                <p className="text-futvar-light mb-4">Você ainda não possui assinatura.</p>
                <Link
                  href="/planos"
                  className="inline-flex px-4 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light"
                >
                  Ver planos
                </Link>
              </div>
            )}
          </section>

          {/* Time do Coração */}
          <section className="rounded-2xl border border-white/10 bg-futvar-dark p-6 shadow-lg md:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4">Time do Coração</h2>
            {favoriteTeam && !showTeamPicker ? (
              <TeamDisplay team={favoriteTeam} onChange={() => setShowTeamPicker(true)} />
            ) : (
              <div className="space-y-4">
                {showTeamPicker && data?.user?.favoriteTeam && (
                  <p className="text-sm text-futvar-light">Time atual: {data.user.favoriteTeam.name}. Escolha outro abaixo ou cancele.</p>
                )}
                {!favoriteTeam && (
                  <p className="text-futvar-light text-sm">Você ainda não escolheu um time do coração. Ele será usado como padrão na próxima compra.</p>
                )}
                <TeamPicker
                  selectedTeam={favoriteTeam}
                  onSelect={setFavoriteTeam}
                  onSave={handleSaveFavoriteTeam}
                  saving={savingFavoriteTeam}
                  placeholder="Buscar time..."
                />
                {showTeamPicker && (
                  <button
                    type="button"
                    onClick={() => setShowTeamPicker(false)}
                    className="text-sm text-futvar-light hover:text-white"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Histórico de compras */}
          <section className="rounded-2xl border border-white/10 bg-futvar-dark p-6 shadow-lg md:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4">Histórico de compras / Pagamentos</h2>
            {purchases.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-8 text-center">
                <p className="text-futvar-light mb-4">Nenhuma compra ainda.</p>
                <Link
                  href="/planos"
                  className="inline-flex px-4 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light"
                >
                  Ver planos
                </Link>
              </div>
            ) : (
              <ul className="space-y-4">
                {purchases.map((p) => (
                  <li key={p.id} className="flex flex-col gap-2 py-3 border-b border-white/10 last:border-0">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-white font-medium">{p.plan?.name ?? 'Compra'}</p>
                        {p.game && (
                          <Link href={`/jogo/${p.game.slug}`} className="text-sm text-futvar-green hover:underline">
                            {p.game.title}
                          </Link>
                        )}
                        <p className="text-futvar-light text-sm">{formatDate(p.purchasedAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.plan?.price != null && (
                          <span className="text-futvar-light text-sm">{formatPrice(p.plan.price)}</span>
                        )}
                        <span
                          className={`text-sm font-medium ${
                            p.paymentStatus === 'paid'
                              ? 'text-green-400'
                              : p.paymentStatus === 'pending'
                              ? 'text-amber-400'
                              : 'text-futvar-light'
                          }`}
                        >
                          {p.paymentStatus === 'paid' ? 'Pago' : p.paymentStatus === 'pending' ? 'Pendente' : p.paymentStatus}
                        </span>
                      </div>
                    </div>
                    {p.team && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 w-fit">
                        {p.team.crestUrl && (
                          <img
                            src={p.team.crestUrl.startsWith('http') ? p.team.crestUrl : `${typeof window !== 'undefined' ? window.location.origin : ''}${p.team.crestUrl.startsWith('/') ? '' : '/'}${p.team.crestUrl}`}
                            alt=""
                            className="h-6 w-6 object-contain rounded bg-white/10"
                          />
                        )}
                        <span className="text-futvar-green text-sm font-medium">{p.team.name}</span>
                      </div>
                    )}
                    {canChooseTeam(p) && teamsForPurchase.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <label className="text-xs text-futvar-light">Escolher time de coração para esta compra:</label>
                        <select
                          defaultValue=""
                          onChange={(e) => handleChooseTeamForPurchase(p.id, e.target.value)}
                          disabled={savingTeamId === p.id}
                          className="px-3 py-2 rounded-lg bg-futvar-darker border border-futvar-green/40 text-sm text-white focus:outline-none focus:ring-2 focus:ring-futvar-green"
                        >
                          <option value="">Selecione um time</option>
                          {teamsForPurchase.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        {savingTeamId === p.id && <span className="text-xs text-futvar-light">Salvando...</span>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {purchases.length > 0 && (
              <Link href="/planos" className="inline-block mt-4 text-futvar-green hover:underline text-sm">
                Ver planos
              </Link>
            )}
          </section>
        </div>

        {data?.isTeamManager && (
          <section className="mt-6 rounded-2xl border border-futvar-green/20 bg-futvar-dark p-6">
            <h2 className="text-lg font-semibold text-white mb-2">Área do time</h2>
            <p className="text-futvar-light text-sm mb-4">
              Você é responsável por um ou mais times. Acesse o painel para gerenciar elenco e comissões.
            </p>
            <Link
              href="/painel-time"
              className="inline-flex px-4 py-2 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light"
            >
              Ir para Área do time
            </Link>
          </section>
        )}

        <nav className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/planos" className="text-futvar-green hover:underline">Planos</Link>
          <Link href="/" className="text-futvar-light hover:underline">Início</Link>
          {data?.isTeamManager && (
            <Link href="/painel-time" className="text-futvar-green hover:underline">Área do time</Link>
          )}
        </nav>
      </div>
    </div>
  );
}
