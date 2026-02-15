'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Slot {
  id: string;
  slotIndex: number;
  clubCode: string;
  paymentStatus: string;
  paymentProvider: string | null;
  paymentReference: string | null;
  paidAt: string | null;
  credentialsSentAt: string | null;
  responsibleName: string;
  clubName: string;
  clubViewerAccount: { loginUsername: string } | null;
}

interface Game {
  id: string;
  title: string;
  status: string;
  thumbnailUrl: string;
  videoUrl: string | null;
  fundedClubsCount: number;
  specialCategory: { name: string };
  clubSlots: Slot[];
  clubAPrice: number;
  clubBPrice: number;
}

export default function AdminPreEstreiaDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [regeneratingSlotId, setRegeneratingSlotId] = useState<string | null>(null);
  const [modalPassword, setModalPassword] = useState<{ slotIndex: number; password: string } | null>(null);

  const fetchGame = () => {
    fetch(`/api/admin/pre-sale-games/${id}`)
      .then((r) => r.json())
      .then((g) => setGame(g?.id ? g : null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!id) return;
    fetchGame();
  }, [id]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetch(`/api/admin/pre-sale-games/${id}/recalculate`, { method: 'POST' });
      if (res.ok) fetchGame();
    } finally {
      setRecalculating(false);
    }
  };

  const handleGenerateCodes = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/admin/pre-sale-games/${id}/generate-codes`, { method: 'POST' });
      if (res.ok) fetchGame();
    } finally {
      setGenerating(false);
    }
  };

  const handleRegeneratePassword = async (slot: Slot) => {
    setRegeneratingSlotId(slot.id);
    try {
      const res = await fetch(`/api/admin/pre-sale-slots/${slot.id}/regenerate-password`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.password) {
        setModalPassword({ slotIndex: slot.slotIndex, password: data.password });
      }
    } finally {
      setRegeneratingSlotId(null);
    }
  };

  const copyPassword = () => {
    if (modalPassword) {
      navigator.clipboard.writeText(modalPassword.password);
    }
  };

  if (loading || !game) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 text-netflix-light">
        {loading ? 'Carregando...' : 'Jogo nao encontrado.'}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link href="/admin/pre-estreia" className="text-netflix-light hover:text-white text-sm mb-6 inline-block">
        Voltar
      </Link>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">{game.title}</h1>
        <div className="flex gap-2">
          <Link
            href={`/admin/pre-estreia/${id}/editar`}
            className="px-4 py-2 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
          >
            Editar
          </Link>
          <button
            onClick={handleGenerateCodes}
            disabled={generating}
            className="px-4 py-2 rounded bg-futvar-green/20 text-futvar-green text-sm hover:bg-futvar-green/30 disabled:opacity-50"
          >
            {generating ? 'Gerando...' : 'Gerar codigos A e B'}
          </button>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="px-4 py-2 rounded bg-futvar-gold/20 text-futvar-gold text-sm hover:bg-futvar-gold/30 disabled:opacity-50"
          >
            {recalculating ? 'Recalculando...' : 'Recalcular status'}
          </button>
        </div>
      </div>

      <div className="bg-netflix-dark border border-white/10 rounded-lg p-6 mb-6">
        <p className="text-netflix-light text-sm">
          Status: <span className="text-white font-medium">{game.status}</span>
        </p>
        <p className="text-netflix-light text-sm">Financiados: {game.fundedClubsCount}/2</p>
        <p className="text-netflix-light text-sm">Categoria especial: {game.specialCategory?.name}</p>
        {game.videoUrl && <p className="text-green-400 text-sm">Video URL preenchida</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {game.clubSlots.map((slot) => (
          <div key={slot.id} className="bg-netflix-dark border border-white/10 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-3">
              Slot {slot.slotIndex} (Clube {slot.slotIndex === 1 ? 'A' : 'B'})
            </h3>
            <p className="text-sm text-netflix-light">
              Codigo: <span className="text-white font-mono">{slot.clubCode}</span>
            </p>
            <p className="text-sm text-netflix-light">
              Status: <span className={slot.paymentStatus === 'PAID' ? 'text-green-400' : 'text-amber-400'}>{slot.paymentStatus}</span>
            </p>
            {slot.paymentProvider && <p className="text-sm text-netflix-light">Provider: {slot.paymentProvider}</p>}
            {slot.paymentReference && <p className="text-sm text-netflix-light truncate">Ref: {slot.paymentReference}</p>}
            {slot.responsibleName && <p className="text-sm text-netflix-light">Responsavel: {slot.responsibleName}</p>}
            {slot.clubName && <p className="text-sm text-netflix-light">Clube: {slot.clubName}</p>}
            {slot.paymentStatus === 'PAID' && slot.clubViewerAccount && (
              <>
                <p className="text-sm text-netflix-light mt-2">
                  Usuario: <span className="text-white font-mono">{slot.clubViewerAccount.loginUsername}</span>
                </p>
                <p className="text-sm text-netflix-light">
                  Credenciais enviadas em:{' '}
                  {slot.credentialsSentAt
                    ? new Date(slot.credentialsSentAt).toLocaleString('pt-BR')
                    : '—'}
                </p>
                <button
                  type="button"
                  onClick={() => handleRegeneratePassword(slot)}
                  disabled={!!regeneratingSlotId}
                  className="mt-2 px-3 py-1.5 rounded bg-amber-500/20 text-amber-400 text-sm hover:bg-amber-500/30 disabled:opacity-50"
                >
                  {regeneratingSlotId === slot.id ? 'Gerando...' : 'Gerar nova senha'}
                </button>
              </>
            )}
            <Link href={`/pre-estreia/${id}/checkout`} className="mt-2 inline-block text-futvar-green text-sm hover:underline">
              Checkout publico
            </Link>
          </div>
        ))}
      </div>

      {modalPassword && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-netflix-dark border border-white/20 rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-2">Nova senha (Slot {modalPassword.slotIndex})</h3>
            <p className="text-netflix-light text-sm mb-3">Exiba e copie a senha agora. Ela nao sera mostrada novamente.</p>
            <p className="font-mono text-white bg-white/10 rounded px-3 py-2 mb-4 break-all">{modalPassword.password}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyPassword}
                className="flex-1 px-4 py-2 rounded bg-futvar-green text-white font-medium hover:bg-futvar-green/90"
              >
                Copiar
              </button>
              <button
                type="button"
                onClick={() => setModalPassword(null)}
                className="flex-1 px-4 py-2 rounded bg-white/20 text-white hover:bg-white/30"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
