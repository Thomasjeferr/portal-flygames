'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, Suspense } from 'react';
import Image from 'next/image';
import CardPaymentScreen from '@/components/checkout/CardPaymentScreen';
import { NaoEncontrouTimeCTA } from '@/components/account/NaoEncontrouTimeCTA';

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

const PIX_TIMEOUT_MINUTES = 15;

function PixPaymentScreen({
  qrCode,
  qrCodeImage,
  purchaseId,
  expiresAt,
  onPaid,
}: {
  qrCode?: string;
  qrCodeImage?: string;
  purchaseId?: string;
  expiresAt?: string;
  onPaid: (result?: { gameTitle?: string; gameSlug?: string }) => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState<{ gameTitle?: string; gameSlug?: string } | null>(null);

  const syncAttemptedRef = useRef(false);
  const pollCountRef = useRef(0);

  const [expiryMs] = useState(() =>
    expiresAt ? new Date(expiresAt).getTime() : Date.now() + PIX_TIMEOUT_MINUTES * 60 * 1000
  );

  useEffect(() => {
    const update = () => {
      const left = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [expiryMs]);

  useEffect(() => {
    if (!purchaseId) return;

    // reinicia contadores quando a purchase muda
    syncAttemptedRef.current = false;
    pollCountRef.current = 0;

    const check = async () => {
      try {
        const res = await fetch(`/api/checkout/purchase/${purchaseId}/status`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.paid) {
            const result = { gameTitle: data.gameTitle, gameSlug: data.gameSlug };
            setPaidSuccess(result);
            onPaid(result);
            return;
          }
        }

        // Se ainda não pagou, após alguns ciclos tenta uma sincronização direta com a Woovi.
        pollCountRef.current += 1;
        if (pollCountRef.current >= 10 && !syncAttemptedRef.current) {
          syncAttemptedRef.current = true;
          try {
            await fetch(`/api/checkout/purchase/${purchaseId}/sync-woovi`, {
              method: 'POST',
              credentials: 'include',
            });
          } catch {
            // ignorar erro de fallback
          }
        }
      } catch {
        // ignore
      }
    };
    check();
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, [purchaseId, onPaid]);

  const handleCopy = async () => {
    if (!qrCode) return;
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      setCopied(false);
    }
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (paidSuccess) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="rounded-2xl border border-futvar-green/40 bg-futvar-green/10 p-8">
            <p className="text-xl font-semibold text-white mb-2">Pagamento aprovado.</p>
            <p className="text-futvar-light">
              {paidSuccess.gameTitle
                ? `Você já pode assistir a ${paidSuccess.gameTitle}. Redirecionando…`
                : 'Redirecionando para sua conta…'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Pague com Pix</h1>
        <p className="text-futvar-light mb-4">Escaneie o QR Code ou use o código Copia e Cola.</p>

        {secondsLeft !== null && (
          <p className="text-amber-300 text-sm font-medium mb-4">
            Tempo para pagar: {fmt(secondsLeft)}
            {secondsLeft === 0 && ' — Expirado'}
          </p>
        )}

        {qrCodeImage && (
          <div className="bg-white p-4 rounded-2xl inline-block mb-4 shadow-lg shadow-black/40">
            <Image src={qrCodeImage} alt="QR Code Pix" width={256} height={256} unoptimized />
          </div>
        )}
        {qrCode && (
          <div className="mb-4 text-left bg-black/40 border border-white/10 rounded-xl p-3 max-h-32 overflow-y-auto">
            <p className="text-[11px] text-futvar-light break-all font-mono leading-relaxed">
              {qrCode}
            </p>
          </div>
        )}

        {qrCode && (
          <button
            type="button"
            onClick={handleCopy}
            className="w-full sm:w-auto mb-2 inline-flex items-center justify-center px-8 py-3 rounded-full bg-futvar-green text-futvar-darker font-bold shadow-lg shadow-futvar-green/30 hover:bg-futvar-green-light focus:outline-none focus:ring-2 focus:ring-futvar-green focus:ring-offset-2 focus:ring-offset-futvar-darker transition-colors mx-auto"
          >
            {copied ? 'Código copiado!' : 'Copia e Cola do Pix'}
          </button>
        )}

        <p className="text-xs text-futvar-light mb-4">
          Clique em &quot;Copia e Cola do Pix&quot; e cole o código no app do seu banco para concluir o pagamento.
        </p>

        <p className="text-sm text-futvar-light">
          Após o pagamento, o acesso será liberado em instantes. Você pode ser redirecionado automaticamente.
        </p>
        <Link href="/conta" className="mt-6 inline-block text-futvar-green hover:underline">Ir para minha conta</Link>
      </div>
    </div>
  );
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
  const [pixQr, setPixQr] = useState<{
    qrCode?: string;
    qrCodeImage?: string;
    purchaseId?: string;
    expiresAt?: string;
  } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [stripeSecret, setStripeSecret] = useState<string | null>(null);
  const [paymentAvailability, setPaymentAvailability] = useState<{ pix: boolean; card: boolean } | null>(null);

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
      fetch('/api/checkout/availability', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({ pix: false, card: false })),
    ])
      .then(async ([authData, plansData, gamesData, teamsData, availability]) => {
        setPaymentAvailability(
          availability && typeof availability.pix === 'boolean' ? availability : { pix: false, card: false }
        );
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
        const pixOk = availability?.pix === true;
        const cardOk = availability?.card === true;
        // Ajusta forma de pagamento padrão:
        // - Jogos avulsos (unitario): Pix se disponível, senão cartão
        // - Planos mensais/anuais: apenas cartão
        if (p) {
          if (p.type === 'unitario') {
            setMethod(pixOk ? 'pix' : 'card');
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
        setPixQr({
          qrCode: data.qrCode,
          qrCodeImage: data.qrCodeImage,
          purchaseId: data.purchaseId,
          expiresAt: data.expiresAt,
        });
      } else if (data.method === 'card' && data.clientSecret) {
        setStripeSecret(data.clientSecret);
        setError('');
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
      <PixPaymentScreen
        qrCode={pixQr.qrCode}
        qrCodeImage={pixQr.qrCodeImage}
        purchaseId={pixQr.purchaseId}
        expiresAt={pixQr.expiresAt}
        onPaid={(result) => {
          setTimeout(() => {
            if (result?.gameSlug) router.push(`/jogo/${result.gameSlug}`);
            else router.push('/conta');
          }, 2000);
        }}
      />
    );
  }

  if (stripeSecret && plan) {
    const planPriceFormatted = `R$ ${Number(plan.price).toFixed(2).replace('.', ',')}`;
    return (
      <CardPaymentScreen
        clientSecret={stripeSecret}
        planName={plan.name}
        planPrice={planPriceFormatted}
        onBack={() => {
          setStripeSecret(null);
          setError('');
        }}
      />
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
              {gameIdParam ? (
                <>
                  <p className="block text-sm font-medium text-futvar-light mb-2">Você está comprando acesso a:</p>
                  {(() => {
                    const lockedGame = games.find((g) => g.id === gameIdParam);
                    return lockedGame ? (
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-futvar-darker border border-futvar-green/30">
                        {lockedGame.thumbnailUrl ? (
                          <div className="relative w-24 h-14 shrink-0 rounded overflow-hidden bg-black/40">
                            <Image src={lockedGame.thumbnailUrl} alt="" fill className="object-cover" sizes="96px" />
                          </div>
                        ) : null}
                        <p className="text-white font-semibold">{lockedGame.title}</p>
                      </div>
                    ) : (
                      <p className="text-futvar-light py-2">Carregando jogo...</p>
                    );
                  })()}
                </>
              ) : (
                <>
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
                </>
              )}
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
            <p className="mt-2">
              <NaoEncontrouTimeCTA />
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-futvar-light mb-2">Forma de pagamento</label>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              {plan.type === 'unitario' && (
                <label
                  className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border ${
                    paymentAvailability?.pix
                      ? 'cursor-pointer border-futvar-green/30 hover:bg-futvar-green/10'
                      : 'cursor-not-allowed border-white/10 opacity-60'
                  }`}
                >
                  <input
                    type="radio"
                    name="method"
                    value="pix"
                    checked={method === 'pix'}
                    onChange={() => paymentAvailability?.pix && setMethod('pix')}
                    disabled={!paymentAvailability?.pix}
                    className="text-futvar-green"
                  />
                  <span className="text-white">Pix</span>
                  {!paymentAvailability?.pix && (
                    <span className="text-amber-400 text-xs">(indisponível)</span>
                  )}
                </label>
              )}
              <label
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-lg border ${
                  paymentAvailability?.card
                    ? 'cursor-pointer border-futvar-green/30 hover:bg-futvar-green/10'
                    : 'cursor-not-allowed border-white/10 opacity-60'
                }`}
              >
                <input
                  type="radio"
                  name="method"
                  value="card"
                  checked={method === 'card'}
                  onChange={() => paymentAvailability?.card && setMethod('card')}
                  disabled={!paymentAvailability?.card}
                  className="text-futvar-green"
                />
                <span className="text-white">Cartão</span>
                {!paymentAvailability?.card && (
                  <span className="text-amber-400 text-xs">(indisponível)</span>
                )}
              </label>
            </div>
            {plan.type !== 'unitario' && (
              <p className="mt-2 text-xs text-futvar-light">
                Para planos mensais ou anuais, o pagamento é feito apenas com cartão, processado com segurança pela Stripe.
              </p>
            )}
            {paymentAvailability && !paymentAvailability.pix && !paymentAvailability.card && (
              <p className="mt-2 text-amber-400 text-sm">
                Nenhum método de pagamento configurado. Configure Woovi (Pix) ou Stripe (cartão) em Admin &gt; Pagamentos.
              </p>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={
              submitting ||
              paymentAvailability === null ||
              (method === 'pix' && !paymentAvailability?.pix) ||
              (method === 'card' && !paymentAvailability?.card)
            }
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
