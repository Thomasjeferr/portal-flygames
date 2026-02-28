'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

function TournamentPaymentForm({
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
      <div className="rounded-xl border border-white/10 bg-futvar-darker p-4">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      {errorMessage && (
        <p className="text-sm text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        className="w-full py-3 rounded-lg bg-futvar-green text-futvar-darker font-semibold disabled:opacity-50"
      >
        {loading ? 'Processando…' : `Pagar ${planPrice}`}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-futvar-light hover:text-white"
      >
        ← Voltar
      </button>
    </form>
  );
}

export default function PagarInscricaoCampeonatoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const teamId = params.id as string;
  const tournamentId = searchParams.get('tournamentId');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [planPrice, setPlanPrice] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!teamId || !tournamentId) {
      setError('Parâmetros inválidos');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/tournament-registration/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tournamentId, teamId, method: 'card' }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Erro ao iniciar pagamento');
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
  }, [teamId, tournamentId]);

  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  useEffect(() => {
    fetch('/api/public/stripe-publishable-key', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.publishableKey) setStripePromise(loadStripe(data.publishableKey));
      })
      .catch(() => {});
  }, []);

  const returnUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/painel-time/times/${teamId}/campeonatos`
      : '';

  if (loading) {
    return (
      <div className="text-futvar-light py-8">Carregando...</div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="rounded-xl border border-white/10 bg-futvar-dark p-6 max-w-md">
        <p className="text-red-400 mb-4">{error || 'Não foi possível iniciar o pagamento.'}</p>
        <Link
          href={`/painel-time/times/${teamId}/campeonatos`}
          className="text-futvar-green hover:underline"
        >
          ← Voltar aos campeonatos
        </Link>
      </div>
    );
  }

  if (!stripePromise) {
    return <div className="text-futvar-light py-8">Carregando formulário...</div>;
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: {
        colorPrimary: '#22c55e',
        colorBackground: '#1a1a1a',
        colorText: '#fff',
        colorDanger: '#ef4444',
        borderRadius: '12px',
      },
    },
  };

  return (
    <div>
      <Link
        href={`/painel-time/times/${teamId}/campeonatos`}
        className="text-futvar-light hover:text-white text-sm mb-4 inline-block"
      >
        ← Voltar aos campeonatos
      </Link>
      <div className="rounded-xl border border-white/10 bg-futvar-dark p-6 max-w-md">
        <h2 className="text-xl font-bold text-white mb-1">Pagar inscrição</h2>
        <p className="text-futvar-light text-sm mb-6">
          {tournamentName} — {teamName} — {planPrice}
        </p>
        <Elements stripe={stripePromise} options={options}>
          <TournamentPaymentForm
            planPrice={planPrice}
            returnUrl={returnUrl}
            onBack={() => window.history.back()}
          />
        </Elements>
      </div>
    </div>
  );
}
