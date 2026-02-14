'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';

interface PreSaleGame {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  clubAPrice: number;
  clubBPrice: number;
  clubSlots: { slotIndex: number; clubCode: string; paymentStatus: string }[];
}

export default function PreEstreiaCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [game, setGame] = useState<PreSaleGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [clubCode, setClubCode] = useState('');
  const [form, setForm] = useState({
    responsibleName: '',
    clubName: '',
    teamMemberCount: '1',
    termsAccepted: false,
  });
  const [pixQr, setPixQr] = useState<{ qrCodeImage?: string; qrCode?: string; amount?: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/pre-sale/games/${id}`)
      .then((r) => r.json())
      .then((g) => setGame(g?.id ? g : null))
      .catch(() => setGame(null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.termsAccepted) {
      setError('Aceite os termos para continuar.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/pre-sale/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          clubCode: clubCode.trim(),
          teamMemberCount: parseInt(form.teamMemberCount, 10) || 1,
        }),
      });
      const data = await res.json();
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

  if (loading) return <div className="pt-24 px-4 text-center text-futvar-light">Carregando...</div>;
  if (!game) return (
    <div className="pt-24 px-4 text-center">
      <p className="text-futvar-light">Jogo nao encontrado.</p>
      <Link href="/" className="text-futvar-green hover:underline">Voltar</Link>
    </div>
  );

  const slot = game.clubSlots.find((s) => s.clubCode === clubCode.trim());
  const isCodeValid = slot && slot.paymentStatus === 'PENDING';
  const price = slot?.slotIndex === 1 ? game.clubAPrice : game.clubBPrice;

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
          <Link href="/conta" className="mt-6 inline-block text-futvar-green hover:underline">Ir para minha conta</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 min-h-screen bg-futvar-darker">
      <div className="max-w-lg mx-auto">
        <Link href="/" className="text-futvar-green hover:underline text-sm mb-6 inline-block">← Voltar</Link>
        <div className="relative aspect-video rounded-lg overflow-hidden mb-6 bg-futvar-gray">
          <Image src={game.thumbnailUrl} alt={game.title} fill className="object-cover" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{game.title}</h1>
        <p className="text-futvar-light text-sm mb-6">{game.description}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Codigo do clube *</label>
            <input
              type="text"
              value={clubCode}
              onChange={(e) => setClubCode(e.target.value.toUpperCase())}
              placeholder="Ex: ABC12XYZ"
              required
              className="w-full px-4 py-3 rounded bg-futvar-dark border border-futvar-green/20 text-white"
            />
            {clubCode && !isCodeValid && (
              <p className="text-amber-400 text-xs mt-1">
                Codigo invalido ou ja pago. Use o codigo enviado pelo admin.
              </p>
            )}
          </div>
          {isCodeValid && (
            <>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Nome do responsavel *</label>
                <input
                  type="text"
                  value={form.responsibleName}
                  onChange={(e) => setForm((f) => ({ ...f, responsibleName: e.target.value }))}
                  required
                  className="w-full px-4 py-3 rounded bg-futvar-dark border border-futvar-green/20 text-white"
                />
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
                  min="1"
                  value={form.teamMemberCount}
                  onChange={(e) => setForm((f) => ({ ...f, teamMemberCount: e.target.value }))}
                  required
                  className="w-full px-4 py-3 rounded bg-futvar-dark border border-futvar-green/20 text-white"
                />
              </div>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={form.termsAccepted}
                  onChange={(e) => setForm((f) => ({ ...f, termsAccepted: e.target.checked }))}
                  className="mt-1"
                />
                <span className="text-sm text-futvar-light">
                  Li e aceito o <Link href="/contrato-direitos-imagem" target="_blank" className="text-futvar-green hover:underline">contrato de direitos de imagem</Link>.
                </span>
              </label>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <p className="text-futvar-green font-semibold">Valor: R$ {price?.toFixed(2).replace('.', ',')}</p>
              <button
                type="submit"
                disabled={submitting || !form.termsAccepted}
                className="w-full py-4 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light disabled:opacity-50"
              >
                {submitting ? 'Gerando Pix...' : 'Gerar QR Code Pix'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
