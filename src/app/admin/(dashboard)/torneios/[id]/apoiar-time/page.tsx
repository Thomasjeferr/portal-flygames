'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

function GoalPaymentForm({
  planPrice,
  returnUrl,
  onBack,
}: {
  planPrice: string;
  returnUrl: string;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setErrorMessage(null);
    setLoading(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: returnUrl,
          receipt_email: undefined,
        },
      });
      if (error) {
        setErrorMessage(error.message ?? 'Erro ao processar pagamento.');
      }
    } catch {
      setErrorMessage('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-netflix-gray/50 p-4">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      {errorMessage && <p className="text-sm text-red-400" role="alert">{errorMessage}</p>}
      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        className="w-full py-3 rounded bg-netflix-red text-white font-semibold disabled:opacity-50"
      >
        {loading ? 'Processando…' : `Assinar ${planPrice}/mês`}
      </button>
      <button type="button" onClick={onBack} className="w-full text-sm text-netflix-light hover:text-white">
        ← Voltar
      </button>
    </form>
  );
}

export default function ApoiarTimePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tournamentId = params.id as string;
  const teamId = searchParams.get('teamId');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [planPrice, setPlanPrice] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tournamentId || !teamId) {
      setError('Parâmetros inválidos');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/tournament-goal/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tournamentId, teamId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Erro ao iniciar assinatura');
          return;
        }
        setClientSecret(data.clientSecret);
        const amount = ((data.amountCents ?? 0) / 100).toFixed(2).replace('.', ',');
        setPlanPrice(`R$ ${amount}`);
        setTournamentName(data.tournamentName ?? 'Torneio');
        setTeamName(data.teamName ?? 'Time');
      } catch {
        setError('Erro de conexão');
      } finally {
        setLoading(false);
      }
    })();
  }, [tournamentId, teamId]);

  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  useEffect(() => {
    fetch('/api/public/stripe-publishable-key', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.publishableKey) setStripePromise(loadStripe(data.publishableKey));
      })
      .catch(() => {});
  }, []);

  const returnUrl = typeof window !== 'undefined' ? `${window.location.origin}/admin/torneios/${tournamentId}` : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-netflix-dark flex items-center justify-center p-4">
        <p className="text-netflix-light">Carregando...</p>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="min-h-screen bg-netflix-dark flex items-center justify-center p-4">
        <div className="bg-netflix-dark border border-white/10 rounded-lg p-6 max-w-md w-full text-center">
          <p className="text-netflix-red mb-4">{error || 'Não foi possível iniciar a assinatura.'}</p>
          <Link href={`/admin/torneios/${tournamentId}`} className="text-netflix-red hover:underline">
            Voltar ao torneio
          </Link>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-netflix-dark flex items-center justify-center p-4">
        <p className="text-netflix-light">Carregando formulário...</p>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: {
        colorPrimary: '#E50914',
        colorBackground: '#1a1a1a',
        colorText: '#fff',
        colorDanger: '#ef4444',
        borderRadius: '12px',
      },
    },
  };

  return (
    <div className="min-h-screen bg-netflix-dark p-4 md:p-8">
      <div className="max-w-md mx-auto">
        <Link href={`/admin/torneios/${tournamentId}`} className="text-netflix-light hover:text-white text-sm mb-4 inline-block">
          ← Voltar ao torneio
        </Link>
        <div className="bg-netflix-dark border border-white/10 rounded-xl p-6">
          <h1 className="text-xl font-bold text-white mb-1">Apoiar time (meta)</h1>
          <p className="text-netflix-light text-sm mb-6">
            {tournamentName} — {teamName} — {planPrice}/mês (cobrança recorrente)
          </p>
          <Elements stripe={stripePromise} options={options}>
            <GoalPaymentForm
              planPrice={planPrice}
              returnUrl={returnUrl}
              onBack={() => window.history.back()}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}
