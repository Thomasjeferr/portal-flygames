'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const planId = searchParams.get('planId');
  const gameIdParam = searchParams.get('gameId');

  const [plan, setPlan] = useState<Plan | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string; city?: string | null; state?: string | null }[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(gameIdParam);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [method, setMethod] = useState<'pix' | 'card'>('pix');
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isClubViewer, setIsClubViewer] = useState(false);
  const [isTeamManager, setIsTeamManager] = useState(false);
  const [pixQr, setPixQr] = useState<{ qrCode?: string; qrCodeImage?: string } | null>(null);
  const [stripeSecret, setStripeSecret] = useState<string | null>(null);

  useEffect(() => {
    if (!planId) {
      setError('Plano não informado');
      setLoading(false);
      return;
    }
    const returnUrl = `${pathname}?${searchParams.toString()}`;
    Promise.all([
      fetch('/api/auth/me', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/plans').then((r) => r.json()),
      fetch('/api/games').then((r) => r.json()),
      fetch('/api/public/teams', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(async ([authData, plansData, gamesData, teamsData]) => {
        const user = authData?.user;
        if (!user) {
          setRedirecting(true);
          router.replace(`/entrar?redirect=${encodeURIComponent(returnUrl)}`);
          return;
        }
        if (user.role === 'club_viewer') setIsClubViewer(true);
        if (authData?.isTeamManager) setIsTeamManager(true);
        const p = Array.isArray(plansData) ? plansData.find((x: { id: string }) => x.id === planId) : null;
        setPlan(p ?? null);
        // Ajusta forma de pagamento padrão:
        // - Jogos avulsos (unitario): Pix por padrão
        // - Planos mensais/anuais: apenas cartão
        if (p) {
          if (p.type === 'unitario') {
            setMethod('pix');
          } else {
            setMethod('card');
          }
        }
        setGames(Array.isArray(gamesData) ? gamesData : []);
        const teamsList = Array.isArray(teamsData) ? teamsData : [];
        setTeams(teamsList);
        if (gameIdParam) setSelectedGameId(gameIdParam);

        // Pré-seleciona o time: preferir favoriteTeamId do usuário; senão último time de compras anteriores
        const planTeamPayout = (p as { teamPayoutPercent?: number } | null)?.teamPayoutPercent ?? 0;
        if (planTeamPayout > 0) {
          const favoriteId = user.favoriteTeamId;
          if (favoriteId && teamsList.some((t: { id: string }) => t.id === favoriteId)) {
            setSelectedTeamId(favoriteId);
          } else {
            try {
              const purchasesRes = await fetch('/api/me/purchases', { credentials: 'include' });
              if (purchasesRes.ok) {
                const { purchases } = await purchasesRes.json();
                const lastWithTeam = Array.isArray(purchases)
                  ? purchases.find((pu: { team?: { id: string } | null }) => pu.team?.id)
                  : null;
                const teamId = lastWithTeam?.team?.id;
                if (teamId && teamsList.some((t: { id: string }) => t.id === teamId)) {
                  setSelectedTeamId(teamId);
                }
              }
            } catch {
              // ignora; seleção de time fica vazia
            }
          }
        }
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [planId, gameIdParam, pathname, searchParams, router]);

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
          teamId: selectedTeamId || null,
          method,
          utmSource: searchParams.get('utm_source') || undefined,
          utmMedium: searchParams.get('utm_medium') || undefined,
          utmCampaign: searchParams.get('utm_campaign') || undefined,
          utmContent: searchParams.get('utm_content') || undefined,
          utmTerm: searchParams.get('utm_term') || undefined,
          refCode: searchParams.get('ref') || undefined,
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

  if (loading || redirecting) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker flex items-center justify-center">
        <p className="text-futvar-light">Carregando...</p>
      </div>
    );
  }

  if (isClubViewer) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-futvar-light mb-4">Esta conta é apenas para acesso à pré-estreia. Para comprar planos ou jogos, crie uma conta no site.</p>
          <Link href="/cadastro" className="text-futvar-green hover:underline font-semibold">Criar conta</Link>
        </div>
      </div>
    );
  }

  if (isTeamManager) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="text-xl font-bold text-white mb-2">Conta de responsável pelo time</h1>
          <p className="text-futvar-light mb-4">
            Esta conta é apenas para gestão do time (comissões e elenco). Para assinar planos ou comprar jogos, saia e crie uma conta de cliente no site.
          </p>
          <Link href="/cadastro" className="text-futvar-green hover:underline font-semibold">Criar conta de cliente</Link>
          <span className="text-futvar-light mx-2">ou</span>
          <Link href="/painel-time" className="text-futvar-green hover:underline font-semibold">Ir para Área do time</Link>
        </div>
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
            <label className="block text-sm font-medium text-futvar-light mb-2">Time de coração (opcional)</label>
            <select
              value={selectedTeamId ?? ''}
              onChange={(e) => setSelectedTeamId(e.target.value || null)}
              className="w-full px-4 py-3 rounded-lg bg-futvar-darker border border-futvar-green/20 text-white focus:outline-none focus:ring-2 focus:ring-futvar-green"
            >
              <option value="">Nenhum</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.city || t.state ? ` — ${[t.city, t.state].filter(Boolean).join('/')}` : ''}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-futvar-light">Parte do valor pode ser repassada ao time que você apoia.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-futvar-light mb-2">Forma de pagamento</label>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {plan.type === 'unitario' && (
                <label className="flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border cursor-pointer border-futvar-green/30 hover:bg-futvar-green/10">
                  <input
                    type="radio"
                    name="method"
                    value="pix"
                    checked={method === 'pix'}
                    onChange={() => setMethod('pix')}
                    className="text-futvar-green"
                  />
                  <span className="text-white">Pix</span>
                </label>
              )}
              <label className="flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border cursor-pointer border-futvar-green/30 hover:bg-futvar-green/10">
                <input
                  type="radio"
                  name="method"
                  value="card"
                  checked={method === 'card'}
                  onChange={() => setMethod('card')}
                  className="text-futvar-green"
                />
                <span className="text-white">Cartão</span>
              </label>
            </div>
            {plan.type !== 'unitario' && (
              <p className="mt-2 text-xs text-futvar-light">
                Para planos mensais ou anuais, o pagamento é feito apenas com cartão, processado com segurança pela Stripe.
              </p>
            )}
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
          Você será redirecionado para sua conta após confirmar o pagamento.
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
