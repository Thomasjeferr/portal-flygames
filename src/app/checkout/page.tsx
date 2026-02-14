'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';

interface Plan {
  id: string;
  name: string;
  type: string;
  periodicity: string;
  price: number;
  description: string | null;
}
interface Game {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('planId');
  const gameIdParam = searchParams.get('gameId');

  const [plan, setPlan] = useState<Plan | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(gameIdParam);
  const [method, setMethod] = useState<'pix' | 'card'>('pix');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [pixQr, setPixQr] = useState<{ qrCode?: string; qrCodeImage?: string } | null>(null);
  const [stripeSecret, setStripeSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!planId) {
      setError('Plano não informado');
      setLoading(false);
      return;
    }
    Promise.all([
      fetch('/api/plans').then((r) => r.json()),
      fetch('/api/games').then((r) => r.json()),
    ])
      .then(([plansData, gamesData]) => {
        const p = Array.isArray(plansData) ? plansData.find((x: { id: string }) => x.id === planId) : null;
        setPlan(p ?? null);
        setGames(Array.isArray(gamesData) ? gamesData : []);
        if (gameIdParam) setSelectedGameId(gameIdParam);
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [planId, gameIdParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    if (plan.type === 'unitario' && !selectedGameId) {
      setError('Selecione um jogo');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          gameId: plan.type === 'unitario' ? selectedGameId : undefined,
          method,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao gerar pagamento');
        return;
      }
      if (data.method === 'pix' && (data.qrCode || data.qrCodeImage)) {
        setPixQr({ qrCode: data.qrCode, qrCodeImage: data.qrCodeImage });
      } else if (data.method === 'card' && data.clientSecret) {
        setStripeSecret(data.clientSecret);
        setError('Configure o Stripe Elements no front para finalizar. Por enquanto use Pix.');
      } else {
        router.push('/conta');
        router.refresh();
      }
    } catch {
      setError('Erro de conexão');
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

  if (!plan) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-futvar-light mb-4">Plano não encontrado.</p>
          <Link href="/planos" className="text-futvar-green hover:underline">Ver planos</Link>
        </div>
      </div>
    );
  }

  if (pixQr && (pixQr.qrCode || pixQr.qrCodeImage)) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Pague com Pix</h1>
          <p className="text-futvar-light mb-6">Escaneie o QR Code com o app do seu banco.</p>
          {pixQr.qrCodeImage && (
            <div className="bg-white p-4 rounded-xl inline-block mb-6">
              <Image src={pixQr.qrCodeImage} alt="QR Code Pix" width={256} height={256} unoptimized />
            </div>
          )}
          {pixQr.qrCode && !pixQr.qrCodeImage && (
            <p className="text-xs text-futvar-light break-all mb-6">{pixQr.qrCode}</p>
          )}
          <p className="text-sm text-futvar-light">Após o pagamento, o acesso será liberado em instantes.</p>
          <Link href="/conta" className="mt-6 inline-block text-futvar-green hover:underline">Ir para minha conta</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-2xl mx-auto">
        <Link href="/planos" className="text-futvar-green hover:underline text-sm mb-6 inline-block">← Voltar aos planos</Link>
        <h1 className="text-2xl font-bold text-white mb-6">Finalizar compra</h1>

        <form onSubmit={handleSubmit} className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-6 space-y-6">
          <div>
            <p className="text-futvar-light text-sm">Plano</p>
            <p className="text-white font-semibold">{plan.name} — R$ {Number(plan.price).toFixed(2).replace('.', ',')}</p>
          </div>

          {plan.type === 'unitario' && (
            <div>
              <label className="block text-sm font-medium text-futvar-light mb-2">Selecione o jogo</label>
              <select
                value={selectedGameId ?? ''}
                onChange={(e) => setSelectedGameId(e.target.value || null)}
                required={plan.type === 'unitario'}
                className="w-full px-4 py-3 rounded-lg bg-futvar-darker border border-futvar-green/20 text-white focus:outline-none focus:ring-2 focus:ring-futvar-green"
              >
                <option value="">Escolha um jogo</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-futvar-light mb-2">Forma de pagamento</label>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <label className="flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border cursor-pointer border-futvar-green/30 hover:bg-futvar-green/10">
                <input type="radio" name="method" value="pix" checked={method === 'pix'} onChange={() => setMethod('pix')} className="text-futvar-green" />
                <span className="text-white">Pix</span>
              </label>
              <label className="flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border cursor-pointer border-futvar-green/30 hover:bg-futvar-green/10">
                <input type="radio" name="method" value="card" checked={method === 'card'} onChange={() => setMethod('card')} className="text-futvar-green" />
                <span className="text-white">Cartão</span>
              </label>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Gerando pagamento...' : method === 'pix' ? 'Gerar QR Code Pix' : 'Pagar com cartão'}
          </button>
        </form>

        <p className="text-futvar-light text-sm mt-4 text-center">
          Você será redirecionado após confirmar o pagamento. Faça login antes de comprar.
        </p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker flex items-center justify-center">
        <p className="text-futvar-light">Carregando...</p>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
