'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  emailVerified?: boolean;
}
interface TeamOption {
  id: string;
  name: string;
  crestUrl?: string | null;
}
interface Purchase {
  id: string;
  purchasedAt: string;
  paymentStatus: string;
  expiresAt: string | null;
  plan: { name: string; type: string; price: number; teamPayoutPercent?: number };
  game: { title: string; slug: string } | null;
  team?: TeamOption | null;
}
interface Subscription {
  active: boolean;
  startDate: string;
  endDate: string;
  plan: { name: string; periodicity: string; price: number } | null;
}

export default function ContaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isTeamManager, setIsTeamManager] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({ name: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/me/purchases'),
      fetch('/api/public/teams', { cache: 'no-store' }),
    ])
      .then(async ([meRes, purchasesRes, teamsRes]) => {
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user) {
            setUser(meData.user);
            setIsTeamManager(meData.isTeamManager ?? false);
            setProfileForm({
              name: meData.user.name ?? '',
              email: meData.user.email ?? '',
            });
          }
        }
        if (purchasesRes.status === 401) {
          router.replace('/entrar?redirect=/conta');
          return null;
        }
        const data = await purchasesRes.json();
        const teamsData = await teamsRes.json().catch(() => []);
        if (data) {
          setPurchases(data.purchases ?? []);
          setSubscription(data.subscription ?? null);
        }
        if (Array.isArray(teamsData)) {
          setTeams(
            teamsData.map((t: { id: string; name: string; crestUrl?: string | null }) => ({
              id: t.id,
              name: t.name,
              crestUrl: t.crestUrl ?? null,
            }))
          );
        }
        return null;
      })
      .finally(() => setLoading(false));
  }, [router]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  const canChooseTeam = (p: Purchase) => {
    const payoutPercent = p.plan.teamPayoutPercent ?? 0;
    return (
      p.paymentStatus === 'paid' &&
      payoutPercent > 0 &&
      !p.team
    );
  };

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
      const data = await res.json();
      if (!res.ok) {
        setProfileMessage({ type: 'error', text: data.error || 'Não foi possível salvar.' });
        return;
      }
      if (data.user) {
        setUser((prev) => (prev ? { ...prev, ...data.user } : null));
        setProfileForm({ name: data.user.name ?? '', email: data.user.email ?? '' });
      }
      const msg =
        data.user?.emailVerified === false
          ? (data.message ?? 'Dados salvos.') + ' Verifique seu novo e-mail para ativar a conta.'
          : data.message ?? 'Dados salvos.';
      setProfileMessage({ type: 'success', text: msg });
    } catch {
      setProfileMessage({ type: 'error', text: 'Erro de conexão.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChooseTeam = async (purchaseId: string, teamId: string) => {
    if (!teamId) return;
    setSavingTeamId(purchaseId);
    try {
      const res = await fetch(`/api/me/purchases/${purchaseId}/choose-team`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Não foi possível salvar o time de coração. Tente novamente.');
        return;
      }
      const chosen = teams.find((t) => t.id === teamId) ?? null;
      setPurchases((prev) =>
        prev.map((p) => (p.id === purchaseId ? { ...p, team: chosen } : p))
      );
    } catch {
      alert('Erro de conexão ao salvar o time de coração.');
    } finally {
      setSavingTeamId(null);
    }
  };

  const teamCrestUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (typeof window !== 'undefined') return window.location.origin + (url.startsWith('/') ? url : `/${url}`);
    return url;
  };

  if (loading) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker flex items-center justify-center">
        <p className="text-futvar-light">Carregando...</p>
      </div>
    );
  }

  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'Usuário';

  return (
    <div className="pt-24 pb-16 px-4 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Minha conta</h1>
        <p className="text-futvar-light mb-8">Olá, {displayName}!</p>

        <section className="bg-futvar-dark border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Dados da conta</h2>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {profileMessage && (
              <div
                className={`text-sm rounded-lg px-3 py-2 ${
                  profileMessage.type === 'success'
                    ? 'bg-green-900/30 text-green-300 border border-green-500/30'
                    : 'bg-red-900/30 text-red-300 border border-red-500/30'
                }`}
              >
                <p>{profileMessage.text}</p>
                {profileMessage.type === 'success' &&
                  profileMessage.text.includes('Verifique seu novo e-mail') && (
                    <Link
                      href={`/verificar-email?email=${encodeURIComponent(profileForm.email || user?.email || '')}`}
                      className="inline-block mt-2 font-medium underline hover:no-underline"
                    >
                      Verificar e-mail agora
                    </Link>
                  )}
              </div>
            )}
            <div>
              <label htmlFor="profile-name" className="block text-sm text-futvar-light mb-1">
                Nome
              </label>
              <input
                id="profile-name"
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full max-w-md px-4 py-2 rounded bg-futvar-darker border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-futvar-green"
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
                className="w-full max-w-md px-4 py-2 rounded bg-futvar-darker border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-futvar-green"
                placeholder="seu@email.com"
              />
              <p className="text-xs text-futvar-light mt-1">
                Se alterar o e-mail, você receberá um código para verificar o novo endereço.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-4 py-2 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light disabled:opacity-50 text-sm"
              >
                {savingProfile ? 'Salvando...' : 'Salvar'}
              </button>
              <Link
                href="/recuperar-senha"
                className="text-futvar-green hover:underline text-sm font-medium"
              >
                Alterar senha
              </Link>
            </div>
          </form>
        </section>

        {isTeamManager && (
          <section className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-2">Área do time</h2>
            <p className="text-futvar-light text-sm mb-4">
              Você é responsável por um ou mais times. Acesse o painel para gerenciar elenco e comissões.
            </p>
            <Link
              href="/painel-time"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light text-sm"
            >
              Ir para Área do time
            </Link>
          </section>
        )}

        {subscription && (
          <section className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Assinatura</h2>
            <div className="flex flex-wrap items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${subscription.active ? 'bg-green-900/50 text-green-300' : 'bg-red-900/30 text-red-300'}`}>
                {subscription.active ? 'Ativa' : 'Inativa'}
              </span>
              {subscription.plan && (
                <span className="text-futvar-light">{subscription.plan.name} • R$ {Number(subscription.plan.price).toFixed(2).replace('.', ',')}</span>
              )}
              <span className="text-futvar-light text-sm">
                Até {formatDate(subscription.endDate)}
              </span>
            </div>
            {!subscription.active && (
              <Link href="/planos" className="inline-block mt-4 text-futvar-green hover:underline">Assinar novamente</Link>
            )}
          </section>
        )}

        <section className="bg-futvar-dark border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Histórico de compras</h2>
          {purchases.length === 0 ? (
            <div className="py-4">
              <p className="text-futvar-light mb-4">Nenhuma compra ainda.</p>
              <Link
                href="/planos"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light text-sm"
              >
                Ver planos
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {purchases.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-2 py-3 border-b border-white/10 last:border-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-white font-medium">{p.plan.name}</p>
                      {p.game && (
                        <Link
                          href={`/jogo/${p.game.slug}`}
                          className="text-sm text-futvar-green hover:underline"
                        >
                          {p.game.title}
                        </Link>
                      )}
                      <p className="text-futvar-light text-sm">
                        {formatDate(p.purchasedAt)}
                      </p>
                    </div>
                    <span
                      className={`text-sm ${
                        p.paymentStatus === 'paid'
                          ? 'text-green-400'
                          : p.paymentStatus === 'pending'
                          ? 'text-amber-400'
                          : 'text-futvar-light'
                      }`}
                    >
                      {p.paymentStatus === 'paid'
                        ? 'Pago'
                        : p.paymentStatus === 'pending'
                        ? 'Aguardando pagamento'
                        : p.paymentStatus}
                    </span>
                  </div>

                  {p.team && (
                    <div className="flex items-center gap-3 mt-2 p-2 rounded-lg bg-white/5 border border-white/10 w-fit">
                      <span className="text-xs text-futvar-light">Time de coração:</span>
                      {p.team.crestUrl && (
                        <img
                          src={teamCrestUrl(p.team.crestUrl) ?? ''}
                          alt=""
                          className="h-8 w-8 object-contain rounded bg-white/10"
                        />
                      )}
                      <span className="text-futvar-green font-medium text-sm">{p.team.name}</span>
                    </div>
                  )}

                  {canChooseTeam(p) && teams.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <label className="text-xs text-futvar-light">
                        Escolher time de coração para esta compra (parte da assinatura vai para o time):
                      </label>
                      <select
                        defaultValue=""
                        onChange={(e) => handleChooseTeam(p.id, e.target.value || '')}
                        disabled={savingTeamId === p.id}
                        className="px-3 py-2 rounded bg-futvar-darker border border-futvar-green/40 text-sm text-white focus:outline-none focus:ring-1 focus:ring-futvar-green"
                      >
                        <option value="">Selecione um time</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      {savingTeamId === p.id && (
                        <span className="text-xs text-futvar-light">Salvando...</span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {purchases.length > 0 && (
            <Link href="/planos" className="inline-block mt-6 text-futvar-green hover:underline text-sm">Ver planos</Link>
          )}
        </section>

        <nav className="mt-8 flex flex-wrap justify-center gap-4 text-sm">
          <Link href="/planos" className="text-futvar-green hover:underline">Planos</Link>
          <Link href="/" className="text-futvar-light hover:underline">Início</Link>
          {isTeamManager && (
            <Link href="/painel-time" className="text-futvar-green hover:underline">Área do time</Link>
          )}
        </nav>
      </div>
    </div>
  );
}
