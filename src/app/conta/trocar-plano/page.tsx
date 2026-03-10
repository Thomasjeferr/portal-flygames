'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CardPaymentScreen from '@/components/checkout/CardPaymentScreen';

interface Plan {
  id: string;
  name: string;
  type: string;
  periodicity: string;
  price: number;
}
interface SubscriptionData {
  active: boolean;
  planId: string | null;
  plan: { id: string; name: string } | null;
}

export default function TrocarPlanoPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingPlanId, setSubmittingPlanId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/account', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/plans', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([accountData, plansData]) => {
        setSubscription(accountData?.subscription ?? null);
        const list = Array.isArray(plansData) ? plansData : [];
        setPlans(list.filter((p: Plan) => p.type === 'recorrente'));
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, []);

  const currentPlanId = subscription?.planId ?? null;
  const subscriptionActive = !!subscription?.active;
  const otherPlans = plans.filter((p) => p.id !== currentPlanId);

  const handleTrocar = async (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    setError('');
    setSubmittingPlanId(planId);
    try {
      const res = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPlanId: planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao trocar plano');
        return;
      }
      if (data.clientSecret) {
        setPlanName(plan.name);
        setClientSecret(data.clientSecret);
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setSubmittingPlanId(null);
    }
  };

  if (loading) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker flex items-center justify-center">
        <p className="text-futvar-light">Carregando...</p>
      </div>
    );
  }

  if (!subscriptionActive || !currentPlanId) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-xl font-bold text-white mb-2">Trocar plano</h1>
          <p className="text-futvar-light mb-4">Você não tem uma assinatura ativa. Assine um plano na página de planos.</p>
          <Link href="/planos" className="text-futvar-green hover:underline font-semibold">Ver planos</Link>
          <p className="mt-4">
            <Link href="/conta" className="text-futvar-light hover:underline text-sm">Voltar à minha conta</Link>
          </p>
        </div>
      </div>
    );
  }

  if (clientSecret && planName) {
    const planPrice = plans.find((p) => p.name === planName)?.price ?? 0;
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold text-white mb-2">Pagar novo plano</h1>
          <p className="text-futvar-light mb-4">Plano: <strong className="text-white">{planName}</strong> — R$ {planPrice.toFixed(2).replace('.', ',')}/mês</p>
          <CardPaymentScreen
            clientSecret={clientSecret}
            planName={planName}
            planPrice={`R$ ${planPrice.toFixed(2).replace('.', ',')}`}
            onBack={() => { setClientSecret(null); setPlanName(''); setError(''); }}
          />
          <p className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { setClientSecret(null); setPlanName(''); router.push('/conta'); }}
              className="text-futvar-light hover:text-white text-sm"
            >
              Voltar à minha conta
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker">
      <div className="max-w-2xl mx-auto">
        <Link href="/conta" className="text-futvar-green hover:underline text-sm mb-6 inline-block">← Minha conta</Link>
        <h1 className="text-2xl font-bold text-white mb-2">Trocar plano</h1>
        <p className="text-futvar-light mb-6">
          Seu plano atual será substituído pelo novo após a confirmação do pagamento. Você não será cobrado duas vezes.
        </p>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <div className="space-y-4">
          {otherPlans.length === 0 ? (
            <p className="text-futvar-light">Não há outros planos disponíveis no momento.</p>
          ) : (
            otherPlans.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-white/10 bg-futvar-dark"
              >
                <div>
                  <p className="font-semibold text-white">{plan.name}</p>
                  <p className="text-futvar-light text-sm">
                    R$ {Number(plan.price).toFixed(2).replace('.', ',')}
                    {plan.periodicity === 'mensal' && '/mês'}
                    {plan.periodicity === 'anual' && '/ano'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTrocar(plan.id)}
                  disabled={!!submittingPlanId}
                  className="px-5 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light disabled:opacity-50"
                >
                  {submittingPlanId === plan.id ? 'Gerando pagamento...' : 'Trocar para este plano'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
