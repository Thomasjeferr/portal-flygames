'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
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
}

type AuthMode = 'login' | 'code';

export default function PreEstreiaWatchPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [game, setGame] = useState<PreSaleGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [clubCode, setClubCode] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [storedClubCode, setStoredClubCode] = useState('');
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

  useEffect(() => {
    if (!game || game.status !== 'PUBLISHED' || sessionToken) return;
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((user) => {
        if (user?.role === 'club_viewer') {
          return fetch('/api/pre-sale/start-session', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, useSession: true }),
          });
        }
      })
      .then((res) => {
        if (res?.ok) return res.json();
      })
      .then((data) => {
        if (data?.sessionToken) {
          setSessionToken(data.sessionToken);
          if (data.clubCode) setStoredClubCode(data.clubCode);
        }
      })
      .catch(() => {});
  }, [game, slug, sessionToken]);

  const heartbeatClubCode = sessionToken ? (storedClubCode || clubCode) : '';
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
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

  const handleCodeSubmit = async (e: React.FormEvent) => {
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
        setError(data.error || 'Erro ao iniciar sessão');
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
            <VideoPlayer
              videoUrl={game.videoUrl}
              title={game.title}
              streamContext={{ preSaleSlug: slug, sessionToken: sessionToken ?? undefined }}
            />
          </div>
          <div className="mb-6">
            <PlayerMatchInfo
              title={game.title}
              subtitle={<span className="text-futvar-green font-medium">Pre-estreia Clubes</span>}
            />
          </div>
          {game.description && <p className="text-futvar-light leading-relaxed max-w-3xl">{game.description}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex items-center gap-2">
            Voltar ao início
          </Link>
        </div>
        <div className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">{game.title}</h1>
          <p className="text-futvar-light text-sm mb-4">Acesse com o usuário e senha enviados ao responsável do clube, ou com o código do clube.</p>
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => { setAuthMode('login'); setError(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${authMode === 'login' ? 'bg-futvar-green text-futvar-darker' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              Usuário e senha
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('code'); setError(''); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${authMode === 'code' ? 'bg-futvar-green text-futvar-darker' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              Código do clube
            </button>
          </div>
          {game.thumbnailUrl && (
            <div className="relative aspect-video rounded-lg overflow-hidden mb-6">
              <Image src={game.thumbnailUrl} alt="" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="text-white text-lg">{authMode === 'login' ? 'Usuário e senha do clube' : 'Código do clube'}</span>
              </div>
            </div>
          )}
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          {authMode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Usuário</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  placeholder="Ex: clube-abc123-1"
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
          ) : (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Código do clube</label>
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
          )}
        </div>
      </div>
    </div>
  );
}
