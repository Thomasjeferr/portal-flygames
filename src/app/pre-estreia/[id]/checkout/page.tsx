'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';

type CheckoutFormData = {
  slotId: string;
  slotIndex: number;
  slotLabel: string;
  price: number;
  maxSimultaneousPerClub: number;
  fundedClubsCount: number;
  game: { title: string; description: string; thumbnailUrl: string };
  prefill: { responsibleName: string; responsibleEmail: string; clubName: string };
};

export default function PreEstreiaCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [ctx, setCtx] = useState<CheckoutFormData | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errorInstruction, setErrorInstruction] = useState('');
  const [form, setForm] = useState({
    responsibleName: '',
    responsibleEmail: '',
    clubName: '',
    teamMemberCount: '1',
    termsAccepted: false,
  });
  const [pixQr, setPixQr] = useState<{ qrCodeImage?: string; qrCode?: string; amount?: number; expiresAt?: string } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | null>(null);
  const [fundedClubsCount, setFundedClubsCount] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const a = await fetch(`/api/pre-sale/games/${id}/responsible-access`, { credentials: 'include' }).then((r) =>
          r.json()
        );
        if (!a.loggedIn || !a.canAccessCheckout) {
          router.replace(`/pre-estreia/${id}`);
          return;
        }
        const r = await fetch(`/api/pre-sale/games/${id}/checkout-form`, { credentials: 'include' });
        const d = await r.json();
        if (!r.ok) {
          setBlocked(d.error || 'Não foi possível abrir o pagamento.');
          return;
        }
        const data = d as CheckoutFormData;
        setCtx(data);
        setPaymentStatus('pending');
        setFundedClubsCount(data.fundedClubsCount ?? null);
        const maxMembers = data.maxSimultaneousPerClub ?? 10;
        setForm((f) => ({
          ...f,
          responsibleName: data.prefill.responsibleName || f.responsibleName,
          responsibleEmail: data.prefill.responsibleEmail || f.responsibleEmail,
          clubName: data.prefill.clubName || f.clubName,
          teamMemberCount: String(maxMembers),
        }));
      } catch {
        router.replace(`/pre-estreia/${id}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrorInstruction('');
    if (!ctx) return;
    if (!form.termsAccepted) {
      setError('Aceite os termos para continuar.');
      return;
    }
    const maxMembers = ctx.maxSimultaneousPerClub ?? 999;
    const memberCount = parseInt(form.teamMemberCount, 10) || 0;
    if (memberCount > maxMembers) {
      setError(`Máximo ${maxMembers} membros (limite de telas deste jogo).`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/pre-sale/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          preSaleGameId: id,
          responsibleName: form.responsibleName.trim(),
          responsibleEmail: form.responsibleEmail.trim(),
          clubName: form.clubName.trim(),
          teamMemberCount: memberCount,
          termsAccepted: true,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.replace(`/pre-estreia/${id}`);
        return;
      }
      if (res.status === 403 && (data.message || data.instruction)) {
        setError(data.message || data.error || '');
        setErrorInstruction(data.instruction || '');
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Erro ao gerar pagamento');
        return;
      }
      setPixQr({ qrCodeImage: data.qrCodeImage, qrCode: data.qrCode, amount: data.amount, expiresAt: data.expiresAt });
      setPaymentStatus('pending');
    } catch {
      setError('Erro de conexao');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!pixQr || !ctx) return;
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/pre-sale/slots/${ctx.slotId}/status`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as {
          paymentStatus: string;
          fundedClubsCount: number;
          totalClubs: number;
        };
        if (!active) return;
        setFundedClubsCount(data.fundedClubsCount ?? null);
        if (data.paymentStatus === 'PAID') {
          setPaymentStatus('paid');
        }
      } catch {
        // silencioso
      }
    };

    poll();
    const idInterval = setInterval(poll, 5000);

    return () => {
      active = false;
      clearInterval(idInterval);
    };
  }, [pixQr, ctx]);

  // Timer de expiração (15 minutos Woovi / expiresAt da cobrança)
  useEffect(() => {
    if (!pixQr?.expiresAt) {
      setRemainingSeconds(null);
      return;
    }
    const expires = new Date(pixQr.expiresAt).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = Math.floor((expires - now) / 1000);
      setRemainingSeconds(diff > 0 ? diff : 0);
    };
    tick();
    const idInterval = setInterval(tick, 1000);
    return () => clearInterval(idInterval);
  }, [pixQr?.expiresAt]);

  if (loading) {
    return (
      <div className="pt-24 px-4 text-center text-futvar-light min-h-[40vh]">
        Carregando formulário de pagamento...
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker max-w-lg mx-auto">
        <Link href={`/pre-estreia/${id}`} className="text-futvar-green hover:underline text-sm mb-6 inline-block">
          ← Voltar
        </Link>
        <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-100">
          <p className="font-medium">{blocked}</p>
          <p className="text-sm mt-3 text-futvar-light">
            Se o slot do seu time já foi quitado ou há outro responsável, confira na Área do time ou com o
            administrador.
          </p>
        </div>
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="pt-24 px-4 text-center">
        <Link href={`/pre-estreia/${id}`} className="text-futvar-green hover:underline">
          Voltar
        </Link>
      </div>
    );
  }

  const maxMembers = ctx.maxSimultaneousPerClub ?? 999;
  const memberCount = parseInt(form.teamMemberCount, 10) || 0;
  const exceedsMemberLimit = memberCount > maxMembers;

  const handleCopyCode = async () => {
    if (!pixQr?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixQr.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  if (pixQr) {
    // Tela de sucesso após confirmação do pagamento
    if (paymentStatus === 'paid') {
      return (
        <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker">
          <div className="max-w-lg mx-auto text-center">
            <h1 className="text-2xl font-bold text-white mb-3">Pagamento confirmado</h1>
            <p className="text-futvar-light mb-4">
              O pagamento do slot <span className="font-semibold text-white">{ctx.slotLabel}</span> foi confirmado com
              sucesso.
            </p>
            <p className="text-futvar-green text-sm mb-4">
              Financiados:{' '}
              <span className="font-semibold">
                {fundedClubsCount ?? 1}/2
              </span>
              .{' '}
              {fundedClubsCount === 2
                ? 'Os dois clubes já financiaram esta pré-estreia. Nossa equipe seguirá o contrato combinado.'
                : 'Assim que o outro clube pagar, nossa equipe seguirá o contrato combinado.'}
            </p>
            <p className="text-futvar-light text-sm mb-6">
              As credenciais de acesso do time foram enviadas para o e-mail do responsável. Compartilhe com o grupo que
              vai assistir à pré-estreia.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
              <Link
                href="/conta"
                className="px-5 py-3 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light"
              >
                Ir para minha conta
              </Link>
              <Link
                href={`/pre-estreia/${id}`}
                className="px-5 py-3 rounded-lg bg-futvar-dark text-futvar-light font-semibold hover:text-white border border-futvar-green/40"
              >
                Ver página do jogo
              </Link>
            </div>
            <p className="text-xs text-futvar-light/80">
              Se não encontrar o e-mail na caixa de entrada, verifique o lixo eletrônico/spam ou atualize seus dados na
              conta.
            </p>
          </div>
        </div>
      );
    }

    // Tela de QR Code enquanto aguarda confirmação
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
          <p className="text-sm text-futvar-light mb-2">Valor: R$ {pixQr.amount?.toFixed(2).replace('.', ',')}</p>
          {pixQr.qrCode && (
            <div className="mb-4 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-futvar-green text-futvar-darker text-sm font-semibold hover:bg-futvar-green-light"
              >
                Copiar código Pix (copia e cola)
              </button>
              {copied && <p className="text-xs text-futvar-green">Código copiado para a área de transferência.</p>}
            </div>
          )}
          {remainingSeconds !== null && remainingSeconds > 0 && (
            <p className="text-xs text-futvar-light mb-4">
              Este QR Code expira em{' '}
              <span className="font-semibold text-white">
                {String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:
                {String(remainingSeconds % 60).padStart(2, '0')}
              </span>
              . Após o tempo expirar, gere um novo pagamento.
            </p>
          )}
          <p className="text-sm text-futvar-light mb-4">
            Aguardando confirmação do Pix. Isso pode levar alguns segundos após o pagamento ser concluído no seu banco.
          </p>
          <Link href="/conta" className="mt-6 inline-block text-futvar-green hover:underline">
            Ir para minha conta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker">
      <div className="max-w-lg mx-auto">
        <Link href={`/pre-estreia/${id}`} className="text-futvar-green hover:underline text-sm mb-6 inline-block">
          ← Voltar
        </Link>
        <p className="text-futvar-light text-sm mb-2">
          Pagamento do slot — <strong className="text-white">{ctx.slotLabel}</strong> (seu time neste jogo). Confira os
          dados e gere o Pix.
        </p>
        <div className="relative aspect-video rounded-lg overflow-hidden mb-6 bg-futvar-gray">
          <Image src={ctx.game.thumbnailUrl} alt={ctx.game.title} fill className="object-cover" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{ctx.game.title}</h1>
        <p className="text-futvar-light text-sm mb-6">{ctx.game.description}</p>

        {(error || errorInstruction) && (
          <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
            <p className="font-medium">{error}</p>
            {errorInstruction && <p className="mt-2 text-sm opacity-90">{errorInstruction}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Nome do responsável *</label>
            <input
              type="text"
              value={form.responsibleName}
              onChange={(e) => setForm((f) => ({ ...f, responsibleName: e.target.value }))}
              required
              className="w-full px-4 py-3 rounded bg-futvar-dark border border-futvar-green/20 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">E-mail do responsável *</label>
            <input
              type="email"
              value={form.responsibleEmail}
              readOnly
              required
              className="w-full px-4 py-3 rounded bg-futvar-dark border border-futvar-green/20 text-white cursor-not-allowed opacity-90"
              title="E-mail da sua conta (não editável)"
            />
            <p className="text-xs text-futvar-light mt-1">
              Credenciais serão enviadas para este e-mail (conta do responsável, não editável).
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Nome do clube *</label>
            <input
              type="text"
              value={form.clubName}
              onChange={(e) => setForm((f) => ({ ...f, clubName: e.target.value }))}
              required
              className="w-full px-4 py-3 rounded bg-futvar-dark border border-futvar-green/20 text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Quantidade de membros *</label>
            <input
              type="number"
              min={1}
              max={maxMembers}
              value={form.teamMemberCount}
              onChange={(e) => setForm((f) => ({ ...f, teamMemberCount: e.target.value }))}
              required
              className={`w-full px-4 py-3 rounded bg-futvar-dark border text-white ${exceedsMemberLimit ? 'border-red-400' : 'border-futvar-green/20'}`}
            />
            <p className="text-xs text-futvar-light mt-1">Máximo: {maxMembers} (telas simultâneas).</p>
            {exceedsMemberLimit && (
              <p className="text-amber-400 text-sm mt-1">Informe no máximo {maxMembers}.</p>
            )}
          </div>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={form.termsAccepted}
              onChange={(e) => setForm((f) => ({ ...f, termsAccepted: e.target.checked }))}
              className="mt-1"
            />
            <span className="text-sm text-futvar-light">
              Li e aceito o{' '}
              <Link href="/contrato-direitos-imagem" target="_blank" className="text-futvar-green hover:underline">
                contrato de direitos de imagem
              </Link>
              .
            </span>
          </label>
          {error && !errorInstruction && <p className="text-red-400 text-sm">{error}</p>}
          <p className="text-futvar-green font-semibold">
            Valor do slot ({ctx.slotLabel}): R$ {ctx.price?.toFixed(2).replace('.', ',')}
          </p>
          <button
            type="submit"
            disabled={submitting || !form.termsAccepted || exceedsMemberLimit}
            className="w-full py-4 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light disabled:opacity-50"
          >
            {submitting ? 'Gerando Pix...' : 'Gerar QR Code Pix'}
          </button>
        </form>
      </div>
    </div>
  );
}

