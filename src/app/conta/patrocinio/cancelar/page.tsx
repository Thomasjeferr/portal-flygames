'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type SponsorOrder = {
  id: string;
  companyName: string;
  sponsorPlan: { name: string; billingPeriod: string };
  sponsor: {
    id: string;
    isActive: boolean;
    endAt: string | null;
    planType: string | null;
    hasLoyalty: boolean;
    loyaltyEndDate: string | null;
    cancellationRequestedAt: string | null;
  } | null;
};

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  } catch {
    return d;
  }
}

export default function ContaPatrocinioCancelarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [orders, setOrders] = useState<SponsorOrder[]>([]);

  useEffect(() => {
    fetch('/api/account', { credentials: 'include' })
      .then((r) => {
        if (r.status === 401) router.replace('/entrar?redirect=/conta/patrocinio/cancelar');
        return r.json();
      })
      .then((data) => {
        const list = data.sponsorOrders ?? [];
        const active = list.filter(
          (o: SponsorOrder) =>
            o.sponsor?.isActive &&
            o.sponsor.endAt &&
            new Date(o.sponsor.endAt) >= new Date() &&
            !o.sponsor.cancellationRequestedAt
        );
        setOrders(active);
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleCancel = async (sponsorId: string) => {
    if (!confirm('Deseja solicitar o cancelamento deste patrocínio? Conforme o tipo do plano, a renovação será cancelada ou sua solicitação será registrada para o administrador.')) return;
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/sponsor-subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sponsorId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Não foi possível processar.');
        return;
      }
      setMessage(data.message || 'Solicitação registrada.');
      setOrders((prev) => prev.filter((o) => o.sponsor?.id !== sponsorId));
      if (data.cancellationRequested || data.alreadyRequested) {
        setTimeout(() => router.push('/conta'), 2000);
      }
    } catch {
      setError('Erro de conexão.');
    } finally {
      setSubmitting(false);
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
      <div className="max-w-xl mx-auto">
        <Link href="/conta" className="text-futvar-green hover:underline text-sm font-semibold mb-6 inline-block">
          ← Voltar para Minha conta
        </Link>
        <h1 className="text-2xl font-bold text-white mb-2">Solicitar cancelamento</h1>
        <p className="text-futvar-light text-sm mb-6">
          Selecione o patrocínio que deseja cancelar. Conforme o plano, o cancelamento pode ser imediato (fim do período) ou apenas registrado para o administrador.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-6 p-4 rounded-xl bg-green-900/20 border border-green-500/30 text-green-300 text-sm">
            {message}
          </div>
        )}

        {orders.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-futvar-dark p-6 text-center">
            <p className="text-futvar-light mb-4">Não há patrocínio ativo para cancelar.</p>
            <Link href="/conta" className="text-futvar-green hover:underline font-medium">
              Voltar para Minha conta
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((o) => (
              <li key={o.id} className="rounded-xl border border-white/10 bg-futvar-dark p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-white font-medium">{o.companyName}</p>
                  <p className="text-futvar-light text-sm">{o.sponsorPlan.name}</p>
                  {o.sponsor?.hasLoyalty && o.sponsor.loyaltyEndDate && (
                    <p className="text-futvar-green text-xs mt-1">
                      Fidelidade até {formatDate(o.sponsor.loyaltyEndDate)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => o.sponsor && handleCancel(o.sponsor.id)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-red-900/40 text-red-300 font-medium hover:bg-red-900/60 disabled:opacity-50"
                >
                  {submitting ? 'Processando...' : 'Solicitar cancelamento'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
