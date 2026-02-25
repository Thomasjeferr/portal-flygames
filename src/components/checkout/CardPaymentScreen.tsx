'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

type CardPaymentScreenProps = {
  clientSecret: string;
  planName: string;
  planPrice: string;
  onBack: () => void;
};

function PaymentForm({ planPrice, onBack }: { planPrice: string; onBack: () => void }) {
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
          return_url: typeof window !== 'undefined' ? `${window.location.origin}/conta` : '/conta',
          receipt_email: undefined,
        },
      });
      if (error) {
        setErrorMessage(error.message ?? 'Erro ao processar pagamento.');
      }
    } catch (err) {
      setErrorMessage('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-futvar-dark/80 p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>
      {errorMessage && (
        <p className="text-sm text-red-400" role="alert">
          {errorMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        className="w-full py-4 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-futvar-green focus:ring-offset-2 focus:ring-offset-futvar-darker"
      >
        {loading ? 'Processando…' : `Confirmar e pagar ${planPrice}`}
      </button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-sm text-futvar-light hover:text-white transition-colors"
      >
        ← Alterar forma de pagamento
      </button>
    </form>
  );
}

export default function CardPaymentScreen({ clientSecret, planName, planPrice, onBack }: CardPaymentScreenProps) {
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/stripe-publishable-key', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.publishableKey) return;
        setStripePromise(loadStripe(data.publishableKey));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stripePromise) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker flex items-center justify-center">
        <p className="text-futvar-light">Carregando formulário de pagamento…</p>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'night' as const,
      variables: {
        colorPrimary: '#22C55E',
        colorBackground: '#0C1222',
        colorText: '#F8FAFC',
        colorDanger: '#ef4444',
        borderRadius: '12px',
      },
    },
  };

  return (
    <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker">
      <div className="max-w-md mx-auto">
        {/* Indicador de etapa */}
        <div className="flex items-center gap-2 text-sm text-futvar-light mb-6">
          <span>1 Resumo</span>
          <span className="text-futvar-green">→</span>
          <span className="text-white font-medium">2 Pagamento</span>
        </div>

        <div className="rounded-2xl border border-futvar-green/20 bg-futvar-dark p-6 shadow-lg">
          <h1 className="text-2xl font-bold text-white mb-1">Conclua o pagamento</h1>
          <p className="text-futvar-light text-sm mb-6">
            {planName} — {planPrice}
          </p>

          <Elements stripe={stripePromise} options={options}>
            <PaymentForm planPrice={planPrice} onBack={onBack} />
          </Elements>

          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-futvar-light text-xs">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>Dados protegidos</span>
          </div>
        </div>
      </div>
    </div>
  );
}
