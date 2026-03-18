'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';

type CheckoutFormData = {
  slotIndex: number;
  slotLabel: string;
  price: number;
  maxSimultaneousPerClub: number;
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
  const [pixQr, setPixQr] = useState<{ qrCodeImage?: string; qrCode?: string; amount?: number } | null>(null);

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
        setForm((f) => ({
          ...f,
          responsibleName: data.prefill.responsibleName || f.responsibleName,
          responsibleEmail: data.prefill.responsibleEmail || f.responsibleEmail,
          clubName: data.prefill.clubName || f.clubName,
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
      setPixQr({ qrCodeImage: data.qrCodeImage, qrCode: data.qrCode, amount: data.amount });
    } catch {
      setError('Erro de conexao');
    } finally {
      setSubmitting(false);
    }
  };

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

  if (pixQr) {
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
          <p className="text-sm text-futvar-light">Valor: R$ {pixQr.amount?.toFixed(2).replace('.', ',')}</p>
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

