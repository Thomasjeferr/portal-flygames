'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import CardPaymentScreen from '@/components/checkout/CardPaymentScreen';

const BILLING_LABEL: Record<string, string> = {
  monthly: 'mensal',
  quarterly: 'trimestral',
  yearly: 'anual',
};

interface SponsorPlan {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
  type?: string;
}

interface SponsorOrderItem {
  id: string;
  sponsorPlan: { id: string; name: string };
  sponsor: { isActive: boolean; endAt: string | null } | null;
}

export default function PatrocinioTrocarPlanoPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SponsorPlan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingPlanId, setSubmittingPlanId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState(0);
  const [planBillingPeriod, setPlanBillingPeriod] = useState('monthly');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/account', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/public/sponsor-plans', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([accountData, plansData]) => {
        const list = Array.isArray(plansData) ? plansData : [];
        const companyPlans = list.filter((p: SponsorPlan) => p.type === 'sponsor_company');
        setPlans(companyPlans);

        const orders: SponsorOrderItem[] = accountData?.sponsorOrders ?? [];
        const now = new Date();
        const activeCompany = orders.find(
          (o) =>
            o.sponsor?.isActive &&
            o.sponsor?.endAt &&
            new Date(o.sponsor.endAt) >= now &&
            o.sponsorPlan?.id
        );
        setCurrentPlanId(activeCompany?.sponsorPlan?.id ?? null);
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, []);

  const otherPlans = plans.filter((p) => p.id !== currentPlanId);

  const handleTrocar = async (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    setError('');
    setSubmittingPlanId(planId);
    try {
      const res = await fetch('/api/sponsor-subscription/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newSponsorPlanId: planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao trocar plano');
        return;
      }
      if (data.clientSecret) {
        setPlanName(data.planName ?? plan.name);
        setPlanPrice((data.amountCents ?? plan.price * 100) / 100);
        setPlanBillingPeriod(plan.billingPeriod ?? 'monthly');
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

  if (!currentPlanId) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-xl font-bold text-white mb-2">Alterar plano empresarial</h1>
          <p className="text-futvar-light mb-4">
            Você não tem um patrocínio empresarial ativo. Contrate um plano na página de patrocínio.
          </p>
          <Link href="/patrocinar" className="text-futvar-green hover:underline font-semibold">
            Ver planos de patrocínio
          </Link>
          <p className="mt-4">
            <Link href="/conta" className="text-futvar-light hover:underline text-sm">
              Voltar à minha conta
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (clientSecret && planName) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold text-white mb-2">Pagar novo plano</h1>
          <p className="text-futvar-light mb-4">
            Plano: <strong className="text-white">{planName}</strong> — R${' '}
            {planPrice.toFixed(2).replace('.', ',')}/{BILLING_LABEL[planBillingPeriod] ?? planBillingPeriod}
          </p>
          <CardPaymentScreen
            clientSecret={clientSecret}
            planName={planName}
            planPrice={`R$ ${planPrice.toFixed(2).replace('.', ',')}`}
            onBack={() => {
              setClientSecret(null);
              setPlanName('');
              setPlanPrice(0);
              setPlanBillingPeriod('monthly');
              setError('');
            }}
          />
          <p className="mt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setClientSecret(null);
                setPlanName('');
                setPlanPrice(0);
                setPlanBillingPeriod('monthly');
                router.push('/conta');
              }}
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
        <Link href="/conta" className="text-futvar-green hover:underline text-sm mb-6 inline-block">
          ← Minha conta
        </Link>
        <h1 className="text-2xl font-bold text-white mb-2">Alterar plano empresarial (upgrade)</h1>
        <p className="text-futvar-light mb-6">
          Seu plano atual continuará ativo até o fim do período já pago. O novo plano será cobrado agora e a
          renovação do plano antigo será cancelada — você não será cobrado duas vezes.
        </p>
        {error && (
          <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {error}
          </p>
        )}
        <div className="space-y-4">
          {otherPlans.length === 0 ? (
            <p className="text-futvar-light">Não há outros planos empresariais disponíveis no momento.</p>
          ) : (
            otherPlans.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-futvar-green/20 bg-futvar-dark"
              >
                <div>
                  <p className="font-semibold text-white">{plan.name}</p>
                  <p className="text-futvar-light text-sm">
                    R$ {Number(plan.price).toFixed(2).replace('.', ',')}/
                    {BILLING_LABEL[plan.billingPeriod] ?? plan.billingPeriod}
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
