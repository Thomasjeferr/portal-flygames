'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useStoreApp } from '@/lib/StoreAppContext';
import { TeamPicker, TeamDisplay } from '@/components/account/TeamPicker';
import { NaoEncontrouTimeCTA } from '@/components/account/NaoEncontrouTimeCTA';
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
  avatarUrl?: string | null;
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
  amountCents?: number | null;
  plan: PlanInfo | null;
  paymentGateway?: string | null;
  cancellationRequestedAt?: string | null;
}

interface PurchaseItem {
  id: string;
  purchasedAt: string;
  paymentStatus: string;
  expiresAt: string | null;
  amountCents?: number | null;
  plan: { name: string; type: string; price?: number; teamPayoutPercent?: number };
  game: { id: string; title: string; slug: string } | null;
  team: TeamOption | null;
}

interface AccountData {
  user: AccountUser;
  isTeamManager: boolean;
  subscription: SubscriptionData | null;
  purchases: PurchaseItem[];
  sponsorOrders?: SponsorOrderItem[];
  accountType?: string;
  accountTypeLabels?: string[];
}

interface SponsorOrderItem {
  id: string;
  companyName: string;
  amountCents: number;
  paymentStatus: string;
  createdAt: string;
  contractAcceptedAt: string | null;
  contractSnapshot: string | null;
  sponsorPlan: { id: string; name: string; price: number; billingPeriod: string; type?: string };
  sponsor: {
    id: string;
    isActive: boolean;
    startAt: string | null;
    endAt: string | null;
    planType: string | null;
    hasLoyalty: boolean;
    loyaltyMonths: number;
    loyaltyStartDate: string | null;
    loyaltyEndDate: string | null;
    contractStatus: string | null;
    cancellationRequestedAt: string | null;
  } | null;
  team: { id: string; name: string; crestUrl: string | null } | null;
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
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  } catch {
    return d;
  }
}

function formatPrice(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export default function ContaPage() {
  const router = useRouter();
  const isStoreApp = useStoreApp();
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);

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
      // Se o usuário ainda não tem time salvo, já abre o seletor para evitar esconder o botão de salvar
      setShowTeamPicker(!json.user?.favoriteTeam);
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

  const handleCancelRenewal = async () => {
    if (!confirm('Deseja cancelar a renovação? Você mantém acesso até o fim do período atual e não será mais cobrado depois.')) return;
    setCancellingSubscription(true);
    setProfileMessage(null);
    try {
      const res = await fetch('/api/subscription/cancel', { method: 'POST', credentials: 'include' });
      const result = await res.json();
      if (!res.ok) {
        setProfileMessage({ type: 'error', text: result.error || 'Não foi possível cancelar a renovação.' });
        return;
      }
      const endStr = result.endDate ? formatDate(result.endDate) : 'o fim do período';
      setProfileMessage({ type: 'success', text: `Renovação cancelada. Você mantém acesso até ${endStr}.` });
      loadAccount();
    } catch {
      setProfileMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setCancellingSubscription(false);
    }
  };

  const canChooseTeam = (p: PurchaseItem) => {
    const payoutPercent = p.plan?.teamPayoutPercent ?? 0;
    return p.paymentStatus === 'paid' && payoutPercent > 0 && !p.team;
  };

  const avatarSrc = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${typeof window !== 'undefined' ? window.location.origin : ''}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setProfileMessage(null);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const res = await fetch('/api/upload/avatar', { method: 'POST', body: fd });
      const result = await res.json();
      if (!res.ok) {
        setProfileMessage({ type: 'error', text: result.error || 'Erro ao enviar foto.' });
        return;
      }
      const newUrl = result.url;
      setData((prev) =>
        prev ? { ...prev, user: { ...prev.user, avatarUrl: newUrl } } : null
      );
      setProfileMessage({ type: 'success', text: 'Foto de perfil atualizada.' });
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('user-updated'));
    } catch {
      setProfileMessage({ type: 'error', text: 'Erro de conexão ao enviar foto.' });
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
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

  if (!data) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker flex items-center justify-center">
        <p className="text-futvar-light">Carregando...</p>
      </div>
    );
  }

  const user = data.user;
  const subscription = data.subscription;
  const purchases = data.purchases ?? [];
  const sponsorOrders = data.sponsorOrders ?? [];
  const accountTypeLabels = data.accountTypeLabels ?? [];
  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'Usuário';
  const subscriptionActive = !!subscription?.active && new Date(subscription.endDate) >= new Date();
  const hasActiveCompanySponsor = accountTypeLabels.includes('Patrocínio empresarial');

  const capabilities: string[] = [];
  const isTeamResponsibleAccount = accountTypeLabels.includes('Responsável pelo time');
  if (isTeamResponsibleAccount) capabilities.push('Gerenciar time(s) no painel (elenco, comissões)');
  if (subscriptionActive) capabilities.push('Assistir jogos com sua assinatura');
  if (sponsorOrders.some((o) => o.sponsor?.isActive && o.sponsor?.planType === 'sponsor_company')) capabilities.push('Acesso ao conteúdo via patrocínio empresarial');
  if (!isTeamResponsibleAccount && capabilities.length === 0) capabilities.push('Comprar planos e jogos', 'Patrocinar time ou empresa');

  return (
    <div className="pt-24 pb-16 px-4 lg:px-12 min-h-screen bg-futvar-darker">
      {favoriteTeamToast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg bg-futvar-green text-futvar-darker font-medium shadow-lg animate-fade-in">
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

        {/* Card tipo de conta */}
        {accountTypeLabels.length > 0 && (
          <div className="mb-6 rounded-2xl border border-futvar-green/20 bg-futvar-dark p-5 shadow-lg">
            <h2 className="text-base font-semibold text-white mb-2">Sua conta</h2>
            <p className="text-sm text-futvar-light mb-2">
              Você acessa como:{' '}
              {accountTypeLabels.map((label, i) => (
                <span key={label}>
                  {i > 0 && ' · '}
                  <span className="font-medium text-futvar-green">{label}</span>
                </span>
              ))}
            </p>
            {capabilities.length > 0 && (
              <p className="text-xs text-futvar-light/90">
                Você pode: {capabilities.join('; ')}.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Perfil — ocupa toda a largura quando responsável pelo time (blocos de plano/histórico ocultos) */}
          <section className={`rounded-2xl border border-white/10 bg-futvar-dark p-6 shadow-lg ${isTeamResponsibleAccount ? 'md:col-span-2' : ''}`}>
            <h2 className="text-lg font-semibold text-white mb-4">Perfil</h2>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <span className="w-20 h-20 rounded-full bg-futvar-darker border-2 border-white/20 flex items-center justify-center text-2xl font-semibold text-white shrink-0 overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={avatarSrc(user.avatarUrl) ?? ''} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (user.name || user.email || 'U').charAt(0).toUpperCase()
                    )}
                  </span>
                  <label className="absolute bottom-0 right-0 flex items-center justify-center w-8 h-8 rounded-full bg-futvar-green text-futvar-darker cursor-pointer hover:bg-futvar-green-light transition-colors">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      className="sr-only"
                      onChange={handleAvatarChange}
                      disabled={uploadingAvatar}
                    />
                    <span className="text-lg leading-none" aria-hidden>{uploadingAvatar ? '…' : '+'}</span>
                  </label>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Foto de perfil</p>
                  <p className="text-xs text-futvar-light">JPG, PNG ou WebP. Máx. 2MB.</p>
                  <label className="mt-1 inline-block text-sm text-futvar-green hover:underline cursor-pointer">
                    {uploadingAvatar ? 'Enviando...' : user.avatarUrl ? 'Alterar foto' : 'Carregar foto'}
                    <input type="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" onChange={handleAvatarChange} disabled={uploadingAvatar} />
                  </label>
                </div>
              </div>
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

          {/* Plano Patrocinador/Torcedor — substituído por "Patrocínio empresarial" quando conta é empresarial */}
          {!isTeamResponsibleAccount && (
          <section className="rounded-2xl border border-white/10 bg-futvar-dark p-6 shadow-lg">
            {hasActiveCompanySponsor ? (
              <>
                <h2 className="text-lg font-semibold text-white mb-4">Patrocínio empresarial</h2>
                <p className="text-futvar-light text-sm mb-4">
                  Sua conta tem patrocínio empresarial ativo. Os detalhes do contrato, valor e próxima cobrança estão no bloco &quot;Patrocínio / Contrato&quot; abaixo.
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/conta/patrocinio/trocar-plano"
                    className="inline-flex px-4 py-2 rounded-lg border border-futvar-green/60 text-futvar-green font-semibold hover:bg-futvar-green/10 text-center"
                  >
                    Alterar plano (upgrade)
                  </Link>
                  <Link
                    href="/conta/patrocinio/cancelar"
                    className="inline-flex px-4 py-2 rounded-lg border border-white/20 text-futvar-light font-medium hover:bg-white/5 text-center text-sm"
                  >
                    Solicitar cancelamento
                  </Link>
                </div>
              </>
            ) : (
            <>
            <h2 className="text-lg font-semibold text-white mb-4">Plano Patrocinador/Torcedor</h2>
            {subscription && subscription.plan ? (
              <div className="space-y-3">
                <p className="text-white font-medium">
                  {subscriptionActive ? 'Você tem assinatura recorrente.' : 'Sua assinatura está inativa.'}
                </p>
                {favoriteTeam && subscriptionActive && (
                  <p className="text-futvar-green font-medium">Você patrocina o {favoriteTeam.name}.</p>
                )}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      subscriptionActive ? 'bg-green-900/40 text-green-300' : 'bg-amber-900/40 text-amber-300'
                    }`}
                  >
                    {subscriptionActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <p className="text-futvar-light text-sm">{subscription.plan.name}</p>
                {/* Regra: só valor pago (amountCents). Nunca preço atual do plano — ver docs/RASTREIO-VALOR-PAGO-COMPRAS.md */}
                {!isStoreApp && (
                  <p className="text-futvar-light">
                    Valor: {subscription.amountCents != null ? formatPrice(subscription.amountCents / 100) : '—'}
                  </p>
                )}
                <p className="text-futvar-light text-sm">
                  Renovação em: {formatDate(subscription.endDate)}
                </p>
                {subscriptionActive && subscription?.cancellationRequestedAt && (
                  <p className="mt-2 px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 text-sm font-medium">
                    Cancelamento agendado. Você mantém acesso até {formatDate(subscription.endDate)}.
                  </p>
                )}
                {!subscriptionActive && !isStoreApp && (
                  <Link
                    href="/planos"
                    className="inline-flex mt-2 px-4 py-2 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light"
                  >
                    Ver planos
                  </Link>
                )}
                {subscriptionActive && !isStoreApp && (
                  <Link
                    href="/conta/trocar-plano"
                    className="inline-flex mt-2 px-4 py-2 rounded-lg border border-futvar-green/60 text-futvar-green font-semibold hover:bg-futvar-green/10"
                  >
                    Trocar plano
                  </Link>
                )}
                {subscriptionActive && !isStoreApp && subscription?.paymentGateway === 'stripe' && !subscription?.cancellationRequestedAt && (
                  <button
                    type="button"
                    onClick={handleCancelRenewal}
                    disabled={cancellingSubscription}
                    className="block mt-2 text-sm text-futvar-light hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {cancellingSubscription ? 'Cancelando...' : 'Cancelar renovação'}
                  </button>
                )}
                {!isStoreApp && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Link href="/planos" className="text-sm text-futvar-green hover:underline">
                      Ver planos
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-6 text-center">
                {(() => {
                  const paidPurchases = purchases.filter((p) => p.paymentStatus === 'paid');
                  const paidWithGame = paidPurchases.filter((p) => p.game);
                  if (paidWithGame.length > 0) {
                    return (
                      <>
                        <p className="text-futvar-light mb-2">Você ainda não patrocina nenhum time.</p>
                        <p className="text-green-300 text-sm font-medium mb-4">
                          Você tem acesso a {paidWithGame.length} jogo(s) comprado(s).
                        </p>
                        <ul className="text-left text-sm text-futvar-light space-y-1 mb-4 max-h-24 overflow-y-auto">
                          {paidWithGame.slice(0, 5).map((p) => (
                            <li key={p.id}>
                              <Link href={`/jogo/${p.game!.slug}`} className="text-futvar-green hover:underline">
                                {p.game!.title}
                              </Link>
                            </li>
                          ))}
                          {paidWithGame.length > 5 && (
                            <li className="text-futvar-light">+ {paidWithGame.length - 5} outro(s) abaixo</li>
                          )}
                        </ul>
                        {!isStoreApp && (
                          <Link
                            href="/planos"
                            className="inline-flex px-4 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light"
                          >
                            Ver planos
                          </Link>
                        )}
                      </>
                    );
                  }
                  return (
                    <>
                      <p className="text-futvar-light mb-4">Você ainda não patrocina nenhum time.</p>
                      {!isStoreApp && (
                        <Link
                          href="/planos"
                          className="inline-flex px-4 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light"
                        >
                          Ver planos
                        </Link>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
            </>
            )}
          </section>
          )}

          {/* Patrocínio / Contrato */}
          {sponsorOrders.length > 0 && (
            <section className="rounded-2xl border border-white/10 bg-futvar-dark p-6 shadow-lg md:col-span-2">
              <h2 className="text-lg font-semibold text-white mb-4">Patrocínio / Contrato</h2>
              <div className="space-y-4">
                {sponsorOrders.map((so) => {
                  const sp = so.sponsor;
                  const isActive = !!sp?.isActive && sp.endAt && new Date(sp.endAt) >= new Date();
                  const typeLabel = sp?.planType === 'sponsor_fan' ? 'Torcedor' : 'Empresarial';
                  const loyaltyEnd = sp?.loyaltyEndDate ? new Date(sp.loyaltyEndDate) : null;
                  const inLoyalty = sp?.hasLoyalty && loyaltyEnd && new Date() < loyaltyEnd;
                  const daysLeft = loyaltyEnd ? Math.ceil((loyaltyEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                  const recLabel = so.sponsorPlan.billingPeriod === 'monthly' ? 'Mensal' : so.sponsorPlan.billingPeriod === 'quarterly' ? 'Trimestral' : 'Anual';
                  return (
                    <div
                      key={so.id}
                      className="rounded-xl border border-futvar-green/20 bg-futvar-darker/80 p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-white font-medium">{so.companyName}</p>
                          <p className="text-futvar-light text-sm">{so.sponsorPlan.name}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-900/40 text-green-300' : 'bg-amber-900/40 text-amber-300'}`}>
                            {isActive ? 'Ativo' : 'Inativo'}
                          </span>
                          <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-futvar-light">
                            {typeLabel}
                          </span>
                          {sp?.hasLoyalty && (
                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-futvar-green/20 text-futvar-green">
                              Fidelidade {inLoyalty ? 'vigente' : 'encerrada'}
                            </span>
                          )}
                          {sp?.contractStatus === 'cancellation_requested' && (
                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-amber-900/40 text-amber-300">
                              Cancelamento solicitado
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-futvar-light">
                        <div><span className="text-white/70">Início:</span> {sp?.startAt ? formatDate(sp.startAt) : '-'}</div>
                        <div><span className="text-white/70">Próxima cobrança:</span> {sp?.endAt ? formatDate(sp.endAt) : '-'}</div>
                        <div><span className="text-white/70">Valor:</span> {formatPrice(so.amountCents / 100)}</div>
                        <div><span className="text-white/70">Recorrência:</span> {recLabel}</div>
                      </div>
                      {sp?.hasLoyalty && loyaltyEnd && (
                        <div className="text-sm border-t border-white/10 pt-3">
                          <p className="text-futvar-light">
                            {inLoyalty ? (
                              <>Fidelidade até <strong className="text-white">{formatDate(loyaltyEnd.toISOString())}</strong>. Faltam <strong className="text-futvar-green">{daysLeft} dias</strong>.</>
                            ) : (
                              <>Período de fidelidade encerrado em {formatDate(loyaltyEnd.toISOString())}.</>
                            )}
                          </p>
                        </div>
                      )}
                      {so.contractSnapshot && (
                        <details className="text-xs text-futvar-light border-t border-white/10 pt-2">
                          <summary className="cursor-pointer hover:text-white">Termo aceito na contratação</summary>
                          <p className="mt-1 whitespace-pre-wrap">{so.contractSnapshot}</p>
                        </details>
                      )}
                      {isActive && !sp?.cancellationRequestedAt && (
                        <div className="pt-2 flex flex-wrap items-center gap-3">
                          {sp?.planType === 'sponsor_company' && (
                            <Link
                              href="/conta/patrocinio/trocar-plano"
                              className="text-sm font-medium text-futvar-green hover:text-futvar-green-light hover:underline"
                            >
                              Alterar plano (upgrade)
                            </Link>
                          )}
                          <Link
                            href="/conta/patrocinio/cancelar"
                            className="text-sm text-futvar-green hover:underline"
                          >
                            Solicitar cancelamento
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

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
                <p className="mt-2">
                  <NaoEncontrouTimeCTA isLoggedIn={true} />
                </p>
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

          {/* Histórico de compras e patrocínios — oculto para responsável pelo time */}
          {!isTeamResponsibleAccount && (
          <section className="rounded-2xl border border-white/10 bg-futvar-dark p-6 shadow-lg md:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4">Histórico de compras / Pagamentos</h2>
            {(() => {
              const hasPurchases = purchases.length > 0;
              const hasSponsorOrders = sponsorOrders.length > 0;
              const hasAny = hasPurchases || hasSponsorOrders;

              if (!hasAny) {
                return (
                  <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-8 text-center">
                    {hasActiveCompanySponsor ? (
                      <>
                        <p className="text-futvar-light mb-2">Você não tem compras de planos ou jogos (Patrocinador/torcedor).</p>
                        <p className="text-futvar-light text-sm">Seu patrocínio empresarial e pagamentos recorrentes estão no bloco &quot;Patrocínio / Contrato&quot; acima.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-futvar-light mb-4">Nenhuma compra ainda.</p>
                        {!isStoreApp && (
                          <Link
                            href="/planos"
                            className="inline-flex px-4 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light"
                          >
                            Ver planos
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                );
              }

              const recLabel = (billingPeriod: string) =>
                billingPeriod === 'monthly' ? 'Mensal' : billingPeriod === 'quarterly' ? 'Trimestral' : 'Anual';

              type HistoryItem = { type: 'purchase'; date: string; data: PurchaseItem } | { type: 'sponsor'; date: string; data: SponsorOrderItem };
              const items: HistoryItem[] = [
                ...purchases.map((p) => ({ type: 'purchase' as const, date: p.purchasedAt, data: p })),
                ...sponsorOrders.map((s) => ({ type: 'sponsor' as const, date: s.createdAt, data: s })),
              ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              return (
                <ul className="space-y-4">
                  {items.map((item) =>
                    item.type === 'purchase' ? (
                      <li key={`p-${item.data.id}`} className="flex flex-col gap-2 py-3 border-b border-white/10 last:border-0">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-futvar-light">Plano/Jogo</span>
                            <div>
                              <p className="text-white font-medium">{(item.data as PurchaseItem).plan?.name ?? 'Compra'}</p>
                              {(item.data as PurchaseItem).game && (
                                <Link href={`/jogo/${(item.data as PurchaseItem).game!.slug}`} className="text-sm text-futvar-green hover:underline">
                                  {(item.data as PurchaseItem).game!.title}
                                </Link>
                              )}
                              <p className="text-futvar-light text-sm">{formatDate(item.date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isStoreApp && (
                              <span className="text-futvar-light text-sm">
                                {(item.data as PurchaseItem).amountCents != null ? formatPrice((item.data as PurchaseItem).amountCents! / 100) : '—'}
                              </span>
                            )}
                            <span
                              className={`text-sm font-medium ${
                                (item.data as PurchaseItem).paymentStatus === 'paid'
                                  ? 'text-green-400'
                                  : (item.data as PurchaseItem).paymentStatus === 'pending'
                                  ? 'text-amber-400'
                                  : 'text-futvar-light'
                              }`}
                            >
                              {(item.data as PurchaseItem).paymentStatus === 'paid' ? 'Pago' : (item.data as PurchaseItem).paymentStatus === 'pending' ? 'Pendente' : (item.data as PurchaseItem).paymentStatus}
                            </span>
                          </div>
                        </div>
                        {(item.data as PurchaseItem).team && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 w-fit">
                            {(item.data as PurchaseItem).team!.crestUrl && (
                              <img
                                src={(item.data as PurchaseItem).team!.crestUrl!.startsWith('http') ? (item.data as PurchaseItem).team!.crestUrl! : `${typeof window !== 'undefined' ? window.location.origin : ''}${(item.data as PurchaseItem).team!.crestUrl!.startsWith('/') ? '' : '/'}${(item.data as PurchaseItem).team!.crestUrl!}`}
                                alt=""
                                className="h-6 w-6 object-contain rounded bg-white/10"
                              />
                            )}
                            <span className="text-futvar-green text-sm font-medium">{(item.data as PurchaseItem).team!.name}</span>
                          </div>
                        )}
                        {canChooseTeam(item.data as PurchaseItem) && teamsForPurchase.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <label className="text-xs text-futvar-light">Escolher time de coração para esta compra:</label>
                            <select
                              defaultValue=""
                              onChange={(e) => handleChooseTeamForPurchase((item.data as PurchaseItem).id, e.target.value)}
                              disabled={savingTeamId === (item.data as PurchaseItem).id}
                              className="px-3 py-2 rounded-lg bg-futvar-darker border border-futvar-green/40 text-sm text-white focus:outline-none focus:ring-2 focus:ring-futvar-green"
                            >
                              <option value="">Selecione um time</option>
                              {teamsForPurchase.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                            {savingTeamId === (item.data as PurchaseItem).id && <span className="text-xs text-futvar-light">Salvando...</span>}
                          </div>
                        )}
                      </li>
                    ) : (
                      <li key={`s-${item.data.id}`} className="flex flex-col gap-2 py-3 border-b border-white/10 last:border-0">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-futvar-green/20 text-futvar-green">Patrocínio</span>
                            <div>
                              <p className="text-white font-medium">{(item.data as SponsorOrderItem).companyName}</p>
                              <p className="text-futvar-light text-sm">{(item.data as SponsorOrderItem).sponsorPlan.name} · {recLabel((item.data as SponsorOrderItem).sponsorPlan.billingPeriod)}</p>
                              <p className="text-futvar-light text-xs">{formatDate(item.date)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-futvar-light text-sm">{formatPrice((item.data as SponsorOrderItem).amountCents / 100)}</span>
                            <span
                              className={`text-sm font-medium ${
                                (item.data as SponsorOrderItem).paymentStatus === 'paid' ? 'text-green-400' : (item.data as SponsorOrderItem).paymentStatus === 'pending' ? 'text-amber-400' : 'text-futvar-light'
                              }`}
                            >
                              {(item.data as SponsorOrderItem).paymentStatus === 'paid' ? 'Pago' : (item.data as SponsorOrderItem).paymentStatus === 'pending' ? 'Pendente' : (item.data as SponsorOrderItem).paymentStatus}
                            </span>
                          </div>
                        </div>
                      </li>
                    )
                  )}
                </ul>
              );
            })()}
            {purchases.length > 0 && !isStoreApp && (
              <Link href="/planos" className="inline-block mt-4 text-futvar-green hover:underline text-sm">
                Ver planos
              </Link>
            )}
          </section>
          )}
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
          {!isStoreApp && (
            <Link href="/planos" className="text-futvar-green hover:underline">Planos</Link>
          )}
          <Link href="/" className="text-futvar-light hover:underline">Início</Link>
          {data?.isTeamManager && (
            <Link href="/painel-time" className="text-futvar-green hover:underline">Área do time</Link>
          )}
        </nav>
      </div>
    </div>
  );
}
