'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Purchase {
  id: string;
  purchasedAt: string;
  paymentStatus: string;
  expiresAt: string | null;
  plan: { name: string; type: string; price: number; teamPayoutPercent?: number };
  game: { title: string; slug: string } | null;
  team?: { id: string; name: string } | null;
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
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [savingTeamId, setSavingTeamId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/me/purchases'),
      fetch('/api/public/teams', { cache: 'no-store' }),
    ])
      .then(async ([purchasesRes, teamsRes]) => {
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
          setTeams(teamsData.map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })));
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
      setPurchases((prev) =>
        prev.map((p) =>
          p.id === purchaseId
            ? { ...p, team: teams.find((t) => t.id === teamId) ?? null }
            : p
        )
      );
    } catch {
      alert('Erro de conexão ao salvar o time de coração.');
    } finally {
      setSavingTeamId(null);
    }
  };

  if (loading) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker flex items-center justify-center">
        <p className="text-futvar-light">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Minha conta</h1>

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

        <section className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Histórico de compras</h2>
          {purchases.length === 0 ? (
            <p className="text-futvar-light">Nenhuma compra ainda.</p>
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
                    <p className="text-xs text-futvar-light">
                      Time de coração: <span className="text-futvar-green">{p.team.name}</span>
                    </p>
                  )}

                  {canChooseTeam(p) && teams.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-xs text-futvar-light">
                        Escolher time de coração para esta compra:
                      </label>
                      <select
                        defaultValue=""
                        onChange={(e) =>
                          handleChooseTeam(p.id, e.target.value || '')
                        }
                        disabled={savingTeamId === p.id}
                        className="px-3 py-1 rounded bg-futvar-darker border border-futvar-green/40 text-xs text-white focus:outline-none focus:ring-1 focus:ring-futvar-green"
                      >
                        <option value="">Selecione um time</option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link href="/planos" className="inline-block mt-6 text-futvar-green hover:underline">Ver planos</Link>
        </section>

        <p className="text-futvar-light text-sm mt-8 text-center">
          <Link href="/" className="hover:underline">Voltar ao início</Link>
        </p>
      </div>
    </div>
  );
}
