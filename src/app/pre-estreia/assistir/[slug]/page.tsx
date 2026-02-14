'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { VideoPlayer } from '@/components/VideoPlayer';

interface PreSaleGame {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string | null;
  status: string;
  maxSimultaneousPerClub: number;
}

export default function PreEstreiaWatchPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [game, setGame] = useState<PreSaleGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [clubCode, setClubCode] = useState('');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/pre-sale/games?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        const g = Array.isArray(data) ? data[0] : data;
        setGame(g?.id ? g : null);
      })
      .catch(() => setGame(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const sendHeartbeat = useCallback(() => {
    if (!sessionToken || !clubCode) return;
    fetch('/api/pre-sale/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, clubCode }),
    }).catch(() => setSessionToken(null));
  }, [sessionToken, clubCode]);

  useEffect(() => {
    if (!sessionToken || !clubCode) return;
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 45000);
    heartbeatRef.current = interval;
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [sessionToken, clubCode, sendHeartbeat]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/pre-sale/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, clubCode: clubCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao iniciar sessao');
        return;
      }
      setSessionToken(data.sessionToken);
    } catch {
      setError('Erro de conexao');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !game) {
    return (
      <div className="min-h-screen bg-futvar-darker flex items-center justify-center text-futvar-light">
        {loading ? 'Carregando...' : 'Jogo nao encontrado.'}
      </div>
    );
  }

  if (game.status !== 'PUBLISHED' || !game.videoUrl) {
    return (
      <div className="min-h-screen bg-futvar-darker flex flex-col items-center justify-center text-futvar-light px-6">
        <p className="text-lg mb-4">Este jogo ainda nao esta disponivel para assistir.</p>
        <Link href="/" className="text-futvar-green hover:underline">Voltar ao inicio</Link>
      </div>
    );
  }

  if (sessionToken) {
    return (
      <div className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <Link href="/" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex items-center gap-2">
              Voltar ao inicio
            </Link>
          </div>
          <div className="rounded-2xl overflow-hidden bg-black mb-8 border border-futvar-green/20 shadow-xl">
            <VideoPlayer videoUrl={game.videoUrl} title={game.title} />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white">{game.title}</h1>
            <p className="text-futvar-green font-medium">Pre-estreia Clubes</p>
            {game.description && <p className="text-futvar-light leading-relaxed max-w-3xl">{game.description}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex items-center gap-2">
            Voltar ao inicio
          </Link>
        </div>
        <div className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">{game.title}</h1>
          <p className="text-futvar-light text-sm mb-6">Digite o codigo do clube para assistir</p>
          {game.thumbnailUrl && (
            <div className="relative aspect-video rounded-lg overflow-hidden mb-6">
              <Image src={game.thumbnailUrl} alt="" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-lg">Informe o codigo do clube</span>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Codigo do clube</label>
              <input
                type="text"
                value={clubCode}
                onChange={(e) => setClubCode(e.target.value)}
                required
                placeholder="Ex: ABC123"
                className="w-full px-4 py-3 rounded bg-futvar-darker border border-white/20 text-white placeholder:text-futvar-light/50"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-4 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light disabled:opacity-50"
            >
              {submitting ? 'Iniciando...' : 'Assistir'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
