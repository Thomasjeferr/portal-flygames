'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Purchase {
  id: string;
  purchasedAt: string;
  paymentStatus: string;
  expiresAt: string | null;
  plan: { name: string; type: string; price: number };
  game: { title: string; slug: string } | null;
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

  useEffect(() => {
    fetch('/api/me/purchases')
      .then((r) => {
        if (r.status === 401) {
          router.replace('/entrar?redirect=/conta');
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setPurchases(data.purchases ?? []);
          setSubscription(data.subscription ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

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
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-white/10 last:border-0">
                  <div>
                    <p className="text-white font-medium">{p.plan.name}</p>
                    {p.game && (
                      <Link href={`/jogo/${p.game.slug}`} className="text-sm text-futvar-green hover:underline">
                        {p.game.title}
                      </Link>
                    )}
                    <p className="text-futvar-light text-sm">{formatDate(p.purchasedAt)}</p>
                  </div>
                  <span className={`text-sm ${p.paymentStatus === 'paid' ? 'text-green-400' : p.paymentStatus === 'pending' ? 'text-amber-400' : 'text-futvar-light'}`}>
                    {p.paymentStatus === 'paid' ? 'Pago' : p.paymentStatus === 'pending' ? 'Aguardando pagamento' : p.paymentStatus}
                  </span>
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
