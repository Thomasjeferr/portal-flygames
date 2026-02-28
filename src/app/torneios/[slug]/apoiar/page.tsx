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
      <div className="rounded-xl border border-white/10 bg-futvar-dark/50 p-4">
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      {errorMessage && <p className="text-sm text-red-400" role="alert">{errorMessage}</p>}
      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        className="w-full py-3 rounded-lg bg-futvar-green text-futvar-darker font-semibold disabled:opacity-50 hover:bg-futvar-green-light transition-colors"
      >
        {loading ? 'Processando…' : `Assinar ${planPrice}/mês`}
      </button>
      <button type="button" onClick={onBack} className="w-full text-sm text-futvar-light hover:text-white">
        ← Voltar
      </button>
    </form>
  );
}

export default function ApoiarTimePublicPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const teamId = searchParams.get('teamId');
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [planPrice, setPlanPrice] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [alreadySubscriber, setAlreadySubscriber] = useState(false);

  useEffect(() => {
    if (!slug || !teamId) {
      setError('Parâmetros inválidos');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const meRes = await fetch('/api/auth/me', { cache: 'no-store' });
        const meData = await meRes.json();
        if (!meData?.user) {
          setNeedsLogin(true);
          setLoading(false);
          return;
        }
        if (meData.hasFullAccess) {
          setAlreadySubscriber(true);
          setLoading(false);
          return;
        }

        const tRes = await fetch(`/api/public/tournaments/${slug}`, { cache: 'no-store' });
        if (!tRes.ok) {
          setError('Torneio não encontrado');
          setLoading(false);
          return;
        }
        const tournament = await tRes.json();
        setTournamentId(tournament.id);
        setTournamentName(tournament.name ?? 'Torneio');
        const team = tournament.teams?.find((tt: { teamId: string }) => tt.teamId === teamId);
        if (!team) {
          setError('Time não encontrado neste torneio');
          setLoading(false);
          return;
        }
        setTeamName(team.team?.name ?? 'Time');

        const res = await fetch('/api/tournament-goal/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tournamentId: tournament.id, teamId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Erro ao iniciar assinatura');
          return;
        }
        setClientSecret(data.clientSecret);
        const amount = ((data.amountCents ?? 0) / 100).toFixed(2).replace('.', ',');
        setPlanPrice(`R$ ${amount}`);
      } catch {
        setError('Erro de conexão');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, teamId]);

  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  useEffect(() => {
    fetch('/api/public/stripe-publishable-key', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.publishableKey) setStripePromise(loadStripe(data.publishableKey));
      })
      .catch(() => {});
  }, []);

  const returnUrl = typeof window !== 'undefined' ? `${window.location.origin}/torneios/${slug}` : '';
  const apoiarRedirect = typeof window !== 'undefined'
    ? `/torneios/${slug}/apoiar?teamId=${teamId}`
    : '/torneios';
  const loginRedirect = typeof window !== 'undefined'
    ? `/entrar?redirect=${encodeURIComponent(apoiarRedirect)}`
    : '/entrar';
  const cadastroRedirect = typeof window !== 'undefined'
    ? `/cadastro?redirect=${encodeURIComponent(apoiarRedirect)}`
    : '/cadastro';

  if (loading) {
    return (
      <div className="min-h-screen bg-futvar-darker flex items-center justify-center p-4 pt-24">
        <p className="text-futvar-light">Carregando...</p>
      </div>
    );
  }

  if (alreadySubscriber) {
    return (
      <div className="min-h-screen bg-futvar-darker flex items-center justify-center p-4 pt-24">
        <div className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-white mb-2">Você já é assinante</h1>
          <p className="text-futvar-light text-sm mb-6">
            O apoio por meta é voltado a novos torcedores. Obrigado por fazer parte da família!
          </p>
          <Link
            href={`/torneios/${slug}`}
            className="inline-block px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors"
          >
            Voltar ao campeonato
          </Link>
        </div>
      </div>
    );
  }

  if (needsLogin) {
    return (
      <div className="min-h-screen bg-futvar-darker flex items-center justify-center p-4 pt-24">
        <div className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-bold text-white mb-2">Cadastro obrigatório</h1>
          <p className="text-futvar-light text-sm mb-6">
            Para apoiar um time na meta você precisa ter uma conta no portal. Faça login ou cadastre-se para continuar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={loginRedirect}
              className="inline-block px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors"
            >
              Já tenho conta – Entrar
            </Link>
            <Link
              href={cadastroRedirect}
              className="inline-block px-6 py-3 rounded-lg bg-white/10 text-white font-bold border border-white/20 hover:bg-white/20 transition-colors"
            >
              Criar conta
            </Link>
          </div>
          <Link href={`/torneios/${slug}`} className="block mt-6 text-sm text-futvar-light hover:text-futvar-green">
            Voltar ao torneio
          </Link>
        </div>
      </div>
    );
  }

  if (error || !clientSecret || !tournamentId) {
    return (
      <div className="min-h-screen bg-futvar-darker flex items-center justify-center p-4 pt-24">
        <div className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-8 max-w-md w-full text-center">
          <p className="text-red-400 mb-4">{error || 'Não foi possível iniciar a assinatura.'}</p>
          <Link href={`/torneios/${slug}`} className="text-futvar-green hover:underline">
            Voltar ao torneio
          </Link>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="min-h-screen bg-futvar-darker flex items-center justify-center p-4 pt-24">
        <p className="text-futvar-light">Carregando formulário...</p>
      </div>
    );
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
    <div className="min-h-screen bg-futvar-darker p-4 md:p-8 pt-24">
      <div className="max-w-md mx-auto">
        <Link href={`/torneios/${slug}`} className="text-futvar-light hover:text-futvar-green text-sm mb-4 inline-block">
          ← Voltar ao torneio
        </Link>
        <div className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-6">
          <h1 className="text-xl font-bold text-white mb-1">Apoiar time (meta)</h1>
          <p className="text-futvar-light text-sm mb-2">
            {tournamentName} — {planPrice}/mês (cobrança recorrente)
          </p>
          <p className="text-sm font-semibold text-futvar-green mb-6" role="status">
            Você está apoiando: <span className="text-white">{teamName}</span>
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
