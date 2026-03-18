'use client';

/**
 * Fluxo final:
 * - Assinante logado (ou admin): abre direto no player.
 * - Logado sem plano: vê "Assistir com minha conta" (Assine) + bloco "Sou do clube".
 * - Não logado: vê "Assistir com minha conta" (Fazer login, Ver planos) + bloco "Sou do clube".
 * - Sou do clube e já recebi acesso do responsável: usa o bloco "Sou do clube" (usuário e senha) e assiste.
 * - Código do clube foi removido para não confundir usuário comum.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useStoreApp } from '@/lib/StoreAppContext';
import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { VideoPlayer } from '@/components/VideoPlayer';
import { PlayerMatchInfo } from '@/components/PlayerMatchInfo';

interface PreSaleGame {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string | null;
  status: string;
  maxSimultaneousPerClub: number;
  premiereAt?: string | null;
}

type MeResponse = {
  user: { id: string; role: string } | null;
  hasFullAccess?: boolean;
};

export default function PreEstreiaWatchPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const isStoreApp = useStoreApp();
  const [game, setGame] = useState<PreSaleGame | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [meLoading, setMeLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [storedClubCode, setStoredClubCode] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const returnUrl = typeof window !== 'undefined' ? `/pre-estreia/assistir/${slug}` : `/pre-estreia/assistir/${slug}`;

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/pre-sale/games?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        const g = Array.isArray(data) ? data[0] : data;
        setGame(g?.id ? g : null);
      })
      .catch(() => setGame(null));
  }, [slug]);

  useEffect(() => {
    if (!game) return;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setMe({ user: data.user ?? null, hasFullAccess: data.hasFullAccess });
      })
      .catch(() => setMe({ user: null }))
      .finally(() => setMeLoading(false));
  }, [game]);

  useEffect(() => {
    if (!game || game.status !== 'PUBLISHED' || !me || meLoading || sessionToken) return;
    if (me.user?.role === 'club_viewer') {
      fetch('/api/pre-sale/start-session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, useSession: true }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data?.sessionToken) {
            setSessionToken(data.sessionToken);
            if (data.clubCode) setStoredClubCode(data.clubCode);
          }
        })
        .catch(() => {});
    }
  }, [game, slug, me, meLoading, sessionToken]);

  const heartbeatClubCode = sessionToken ? storedClubCode : '';
  const sendHeartbeat = useCallback(() => {
    if (!sessionToken || !heartbeatClubCode) return;
    fetch('/api/pre-sale/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, clubCode: heartbeatClubCode }),
    }).catch(() => setSessionToken(null));
  }, [sessionToken, heartbeatClubCode]);

  useEffect(() => {
    if (!sessionToken || !heartbeatClubCode) return;
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 45000);
    heartbeatRef.current = interval;
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [sessionToken, heartbeatClubCode, sendHeartbeat]);

  const handleClubLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loginRes = await fetch('/api/pre-sale/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword, slug }),
      });
      if (!loginRes.ok) {
        const d = await loginRes.json();
        setError(d.error || 'Usuário ou senha incorretos');
        setSubmitting(false);
        return;
      }
      const startRes = await fetch('/api/pre-sale/start-session', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, useSession: true }),
      });
      const data = await startRes.json();
      if (!startRes.ok) {
        setError(data.error || 'Erro ao iniciar sessão');
        setSubmitting(false);
        return;
      }
      setSessionToken(data.sessionToken);
      if (data.clubCode) setStoredClubCode(data.clubCode);
    } catch {
      setError('Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  };

  const renderPlayer = (subtitle: React.ReactNode) => (
    <div className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex items-center gap-2">
            Voltar ao início
          </Link>
        </div>
        <div className="rounded-2xl overflow-hidden bg-black mb-8 border border-futvar-green/20 shadow-xl">
          <VideoPlayer
            videoUrl={game!.videoUrl!}
            title={game!.title}
            streamContext={
              sessionToken
                ? { preSaleSlug: slug, sessionToken }
                : { preSaleSlug: slug }
            }
          />
        </div>
        <div className="mb-6">
          <PlayerMatchInfo
            title={game!.title}
            subtitle={subtitle}
          />
        </div>
        {game!.description && (
          <p className="text-futvar-light leading-relaxed max-w-3xl">{game!.description}</p>
        )}
      </div>
    </div>
  );

  if (!game) {
    return (
      <div className="min-h-screen bg-futvar-darker flex items-center justify-center text-futvar-light">
        Carregando...
      </div>
    );
  }

  if (game.status !== 'PUBLISHED' || !game.videoUrl) {
    return (
      <div className="min-h-screen bg-futvar-darker pt-20 sm:pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-lg mx-auto">
          <Link
            href="/"
            className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex items-center gap-2 mb-8"
          >
            Voltar ao início
          </Link>
          <div className="bg-futvar-dark border border-white/10 rounded-2xl p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-futvar-green/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-futvar-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white mb-2">{game.title}</h1>
            {game.premiereAt && (
              <p className="text-futvar-green font-semibold mb-3">
                {new Date(game.premiereAt).toLocaleString('pt-BR', {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })}
              </p>
            )}
            <p className="text-futvar-light mb-6">
              Este jogo ainda não está disponível para assistir. A transmissão será liberada na data do jogo.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/pre-estreia/${game.id}`}
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors"
              >
                Ver página do jogo
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-white/30 text-futvar-light font-semibold hover:bg-white/5 transition-colors"
              >
                Voltar ao início
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (meLoading) {
    return (
      <div className="min-h-screen bg-futvar-darker flex items-center justify-center text-futvar-light">
        Carregando...
      </div>
    );
  }

  if (sessionToken) {
    return renderPlayer(<span className="text-futvar-green font-medium">Pré-estreia Clubes</span>);
  }

  if (me?.user && (me?.hasFullAccess || me?.user?.role === 'admin')) {
    return renderPlayer(<span className="text-futvar-green font-medium">Conteúdo do portal</span>);
  }

  const loginUrl = `/entrar?redirect=${encodeURIComponent(returnUrl)}`;

  return (
    <div className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex items-center gap-2">
            Voltar ao início
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-white mb-6">{game.title}</h1>

        <div className="space-y-8">
          <section className="bg-futvar-dark border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">Assistir com minha conta</h2>
            {isStoreApp ? (
              <>
                <p className="text-futvar-light text-sm mb-4">
                  Este conteúdo não está disponível no momento.
                </p>
                {!me?.user && (
                  <Link
                    href={loginUrl}
                    className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors"
                  >
                    Fazer login
                  </Link>
                )}
              </>
            ) : me?.user ? (
              <>
                <p className="text-futvar-light text-sm mb-4">
                  Este jogo está no catálogo. Assine para assistir.
                </p>
                <Link
                  href="/planos"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors"
                >
                  Ver planos
                </Link>
              </>
            ) : (
              <>
                <p className="text-futvar-light text-sm mb-4">
                  Faça login se você já é assinante ou assine para ter acesso a este jogo.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={loginUrl}
                    className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light transition-colors"
                  >
                    Fazer login
                  </Link>
                  <Link
                    href="/planos"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-lg border border-futvar-green text-futvar-green font-semibold hover:bg-futvar-green/10 transition-colors"
                  >
                    Ver planos
                  </Link>
                </div>
              </>
            )}
          </section>

          <section className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">Sou do clube</h2>
            <p className="text-futvar-light text-sm mb-4">
              Use o usuário e a senha enviados ao responsável do clube.
            </p>
            {game.thumbnailUrl && (
              <div className="relative aspect-video rounded-lg overflow-hidden mb-4">
                <Image src={game.thumbnailUrl} alt="" fill className="object-cover" />
              </div>
            )}
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <form onSubmit={handleClubLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Usuário</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  placeholder="Ex: clube-seu-time-1234@clubviewer.interno.portal"
                  className="w-full px-4 py-3 rounded bg-futvar-darker border border-white/20 text-white placeholder:text-futvar-light/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">Senha</label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    placeholder="Senha enviada por e-mail"
                    className="w-full px-4 py-3 pr-20 rounded bg-futvar-darker border border-white/20 text-white placeholder:text-futvar-light/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-white/70 hover:text-white"
                    aria-label={showLoginPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showLoginPassword ? 'Ocultar' : 'Ver'}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-4 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light disabled:opacity-50"
              >
                {submitting ? 'Entrando...' : 'Entrar e assistir'}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
