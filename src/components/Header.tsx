'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatarUrl?: string | null;
}

interface Subscription {
  active: boolean;
  endDate: string | null;
}

type LiveHighlightMode = 'LIVE' | 'SCHEDULED' | 'NONE';

interface LiveHighlight {
  mode: LiveHighlightMode;
  live: {
    id: string;
    title: string;
    thumbnailUrl: string | null;
    status: string;
    startAt: string | null;
    requireSubscription: boolean;
    allowOneTimePurchase: boolean;
  } | null;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [liveHighlight, setLiveHighlight] = useState<LiveHighlight>({ mode: 'NONE', live: null });
  const [livePreviewOpen, setLivePreviewOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isAdmin = pathname.startsWith('/admin');
  const isAuthPage = ['/entrar', '/cadastro', '/recuperar-senha', '/admin/entrar'].some((p) => pathname.startsWith(p));

  const [isPartner, setIsPartner] = useState(false);

  const fetchUser = useCallback(() => {
    if (isAdmin) return;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object' && !data.error) {
          setUser(data.user ?? null);
          setSubscription(data.subscription ?? null);
          setIsPartner(!!data.isPartner);
        }
      })
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser, pathname]);

  useEffect(() => {
    const onUserUpdated = () => fetchUser();
    window.addEventListener('user-updated', onUserUpdated);
    return () => window.removeEventListener('user-updated', onUserUpdated);
  }, [fetchUser]);

  useEffect(() => {
    if (isAdmin) return;
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [isAdmin, pathname]);

  useEffect(() => {
    if (isAdmin) return;
    fetch('/api/public/live-highlight', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: LiveHighlight) => {
        if (!data || !data.mode) return;
        setLiveHighlight(data);
      })
      .catch(() => {});
  }, [isAdmin]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setSubscription(null);
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
    if (isAdmin) router.push('/admin/entrar');
    else router.push('/');
    router.refresh();
  };

  if (isAdmin && !pathname.startsWith('/admin/entrar')) {
    return null;
  }

  if (isAdmin && pathname.startsWith('/admin/entrar')) {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 bg-netflix-black/95 border-b border-white/10">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto">
          <Link href="/admin/entrar" className="flex items-center gap-2">
            <img src="/uploads/logo-home-fly.png" alt="FLY GAMES" className="h-8 w-auto object-contain" width={140} height={42} />
            <span className="text-lg text-netflix-light">Admin</span>
          </Link>
          <Link href="/" className="text-sm text-futvar-light hover:text-white">
            Voltar ao site
          </Link>
        </div>
      </header>
    );
  }

  const liveBadge =
    !isAuthPage &&
    !isAdmin &&
    liveHighlight.mode !== 'NONE' &&
    liveHighlight.live && (
      <div className="hidden md:flex items-center mr-4">
        <button
          type="button"
          onClick={() => setLivePreviewOpen((o) => !o)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-sm transition-colors ${
            liveHighlight.mode === 'LIVE'
              ? 'border-red-500 bg-red-600 text-white hover:bg-red-500 shadow-red-500/30 shadow-md'
              : 'border-amber-400/60 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            {liveHighlight.mode === 'LIVE' && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 animate-ping opacity-70" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                liveHighlight.mode === 'LIVE'
                  ? 'bg-red-300 animate-live-blink'
                  : 'bg-amber-200'
              }`}
            />
          </span>
          <span className="uppercase tracking-wide">
            {liveHighlight.mode === 'LIVE' ? 'Ao vivo agora' : 'Live agendada'}
          </span>
        </button>
        {livePreviewOpen && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[320px] sm:w-[380px] bg-futvar-dark border border-futvar-green/25 rounded-2xl shadow-2xl p-4 z-40">
            <p className="text-xs text-futvar-light mb-1">
              {liveHighlight.mode === 'LIVE' ? 'Transmissão ao vivo' : 'Próxima live'}
            </p>
            <p className="text-sm font-semibold text-white mb-1 line-clamp-2">
              {liveHighlight.live.title}
            </p>
            {liveHighlight.live.startAt && (
              <p className="text-xs text-futvar-light mb-3">
                {liveHighlight.mode === 'LIVE' ? 'Iniciada em ' : 'Horário: '}
                {new Date(liveHighlight.live.startAt).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
            <div className="flex justify-between items-center gap-2">
              <Link
                href={`/live/${liveHighlight.live.id}`}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg bg-futvar-green text-futvar-darker text-sm font-bold hover:bg-futvar-green-light transition-colors"
                onClick={() => {
                  setLivePreviewOpen(false);
                  setMobileMenuOpen(false);
                }}
              >
                {liveHighlight.mode === 'LIVE' ? 'Assistir agora' : 'Ver detalhes'}
              </Link>
              <button
                type="button"
                onClick={() => setLivePreviewOpen(false)}
                className="px-3 py-2 rounded-lg bg-futvar-gray text-futvar-light text-xs hover:bg-white/10"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    );

  const isHome = !isAdmin && pathname === '/';

  const headerClasses = isHome && !scrolled
    ? 'bg-gradient-to-b from-futvar-darker to-futvar-darker/0'
    : 'bg-futvar-darker/95 backdrop-blur-md border-b border-futvar-green/10';

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 animate-slide-down ${headerClasses}`}>
        <div className="flex items-center justify-between gap-4 sm:gap-6 px-4 sm:px-6 lg:px-12 py-3 sm:py-4 max-w-[1920px] mx-auto">
        <Link href="/" className="flex items-center gap-2 group shrink-0 min-w-[100px] sm:min-w-[120px]">
          <img
            src="/uploads/logo-home-fly.png"
            alt="FLY GAMES"
            width={160}
            height={48}
            className="h-8 sm:h-9 lg:h-10 w-auto object-contain group-hover:opacity-90 transition-opacity"
          />
        </Link>

        {!isAuthPage && (
          <>
            <nav className="hidden md:flex items-center gap-4 lg:gap-6 ml-0 flex-1 justify-end min-w-0">
            <Link
              href="/"
              className={`text-sm font-semibold ${pathname === '/' ? 'text-futvar-green' : 'text-futvar-light hover:text-white'}`}
            >
              Início
            </Link>
            <Link
              href="/times/cadastrar"
              className={`text-sm font-semibold ${pathname === '/times/cadastrar' ? 'text-futvar-green' : 'text-futvar-light hover:text-white'}`}
            >
              Cadastrar time
            </Link>
            <Link
              href="/painel-time"
              className={`text-sm font-semibold ${pathname.startsWith('/painel-time') ? 'text-futvar-green' : 'text-futvar-light hover:text-white'}`}
            >
              Área do time
            </Link>
            <Link
              href="/resultados"
              className={`text-sm font-semibold ${pathname.startsWith('/resultados') ? 'text-futvar-green' : 'text-futvar-light hover:text-white'}`}
            >
              Resultados
            </Link>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-sm text-futvar-light hover:text-white max-w-[180px] sm:max-w-none"
                >
                  <span className="w-8 h-8 rounded-full bg-netflix-gray flex items-center justify-center text-white font-semibold shrink-0 overflow-hidden ring-2 ring-white/20">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `${typeof window !== 'undefined' ? window.location.origin : ''}${user.avatarUrl.startsWith('/') ? '' : '/'}${user.avatarUrl}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (user.name || user.email).charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="hidden sm:inline truncate">{user.name || user.email}</span>
                </button>
                {userMenuOpen &&
                  typeof document !== 'undefined' &&
                  createPortal(
                    <button
                      type="button"
                      className="fixed inset-0 z-[9998] cursor-default"
                      onClick={() => setUserMenuOpen(false)}
                      aria-label="Fechar menu do usuário"
                    />,
                    document.body
                  )}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 py-2 bg-futvar-dark border border-futvar-green/20 rounded-xl shadow-xl z-[60]">
                    <div className="px-4 py-2 border-b border-white/10">
                      <p className="text-sm font-medium truncate">{user.name || user.email}</p>
                      <p className="text-xs text-futvar-light truncate">{user.email}</p>
                      {subscription && (
                        <p className={`text-xs mt-1 ${subscription.active ? 'text-green-400' : 'text-amber-400'}`}>
                          {subscription.active ? 'Assinatura ativa' : 'Assinatura inativa'}
                        </p>
                      )}
                    </div>
                    <Link
                      href="/painel-time"
                      className="block px-4 py-2 text-sm text-futvar-light hover:bg-white/5"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Área do time
                    </Link>
                    <Link
                      href="/resultados"
                      className="block px-4 py-2 text-sm text-futvar-light hover:bg-white/5"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Resultados
                    </Link>
                    {isPartner && (
                      <Link
                        href="/parceiro"
                        className="block px-4 py-2 text-sm text-futvar-light hover:bg-white/5"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Dashboard Parceiro
                      </Link>
                    )}
                    <Link
                      href="/conta"
                      className="block px-4 py-2 text-sm text-futvar-light hover:bg-white/5"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Minha conta
                    </Link>
                    <Link
                      href="/planos"
                      className="block px-4 py-2 text-sm text-futvar-light hover:bg-white/5"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Planos
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-futvar-light hover:bg-white/5"
                    >
                      Sair
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/entrar"
                  className="text-sm font-medium text-futvar-light hover:text-white"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-futvar-green text-futvar-darker text-sm font-bold hover:bg-futvar-green-light transition-colors whitespace-nowrap"
                >
                  Cadastrar
                </Link>
              </>
            )}
            </nav>

            {liveBadge}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-futvar-light hover:bg-white/10 hover:text-white transition-colors"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileMenuOpen}
            >
              <span className="text-2xl">{mobileMenuOpen ? '✕' : '☰'}</span>
            </button>
          </>
        )}

        {!isAuthPage && mobileMenuOpen && typeof document !== 'undefined' && createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[9998] md:hidden bg-black/50 cursor-default w-full h-full"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Fechar menu"
            />
            <div className="fixed inset-x-0 top-0 z-[9999] md:hidden pt-[4.5rem] bg-futvar-darker border-b border-futvar-green/20 shadow-xl max-h-[85vh] overflow-y-auto">
            <nav className="flex flex-col p-4 gap-1">
              {liveHighlight.mode !== 'NONE' && liveHighlight.live && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    const live = liveHighlight.live;
                    if (live) router.push(`/live/${live.id}`);
                  }}
                  className={`mb-2 px-4 py-3 rounded-lg text-sm font-semibold flex items-center justify-between border ${
                    liveHighlight.mode === 'LIVE'
                      ? 'bg-red-600/90 border-red-500 text-white'
                      : 'bg-futvar-dark border-futvar-green/40 text-futvar-light'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      {liveHighlight.mode === 'LIVE' && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 animate-ping opacity-70" />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                          liveHighlight.mode === 'LIVE'
                            ? 'bg-red-300 animate-live-blink'
                            : 'bg-amber-200'
                        }`}
                      />
                    </span>
                    <span className="truncate max-w-[170px] text-left">
                      {liveHighlight.mode === 'LIVE' ? 'Ao vivo: ' : 'Live agendada: '}
                      {liveHighlight.live.title}
                    </span>
                  </span>
                  <span className={`text-xs font-bold ${liveHighlight.mode === 'LIVE' ? 'text-red-100' : 'text-futvar-green'}`}>
                    {liveHighlight.mode === 'LIVE' ? 'Assistir' : 'Ver'}
                  </span>
                </button>
              )}
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-semibold ${pathname === '/' ? 'text-futvar-green bg-futvar-green/10' : 'text-futvar-light hover:bg-white/5'}`}
              >
                Início
              </Link>
              <Link
                href="/times/cadastrar"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-semibold ${pathname === '/times/cadastrar' ? 'text-futvar-green bg-futvar-green/10' : 'text-futvar-light hover:bg-white/5'}`}
              >
                Cadastrar time
              </Link>
              <Link
                href="/painel-time"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-semibold ${pathname.startsWith('/painel-time') ? 'text-futvar-green bg-futvar-green/10' : 'text-futvar-light hover:bg-white/5'}`}
              >
                Área do time
              </Link>
              <Link
                href="/resultados"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-semibold ${pathname.startsWith('/resultados') ? 'text-futvar-green bg-futvar-green/10' : 'text-futvar-light hover:bg-white/5'}`}
              >
                Resultados
              </Link>
              {user ? (
                <>
                  <div className="px-4 py-2 text-sm text-futvar-light border-b border-white/10 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-netflix-gray flex items-center justify-center text-white font-semibold shrink-0 overflow-hidden">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `${typeof window !== 'undefined' ? window.location.origin : ''}${user.avatarUrl.startsWith('/') ? '' : '/'}${user.avatarUrl}`} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (user.name || user.email).charAt(0).toUpperCase()
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{user.name || user.email}</p>
                    {subscription && (
                      <p className={`text-xs mt-0.5 ${subscription.active ? 'text-green-400' : 'text-amber-400'}`}>
                        {subscription.active ? 'Assinatura ativa' : 'Assinatura inativa'}
                      </p>
                    )}
                    </div>
                  </div>
                  <Link href="/painel-time" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm text-futvar-light hover:bg-white/5">
                    Área do time
                  </Link>
                  {isPartner && (
                    <Link href="/parceiro" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm text-futvar-light hover:bg-white/5">
                      Dashboard Parceiro
                    </Link>
                  )}
                  <Link href="/conta" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm text-futvar-light hover:bg-white/5">
                    Minha conta
                  </Link>
                  <Link href="/planos" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm text-futvar-light hover:bg-white/5">
                    Planos
                  </Link>
                  <button onClick={handleLogout} className="px-4 py-3 rounded-lg text-sm text-futvar-light hover:bg-red-900/20 hover:text-red-300 text-left">
                    Sair
                  </button>
                </>
              ) : (
                <>
                  <Link href="/entrar" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm text-futvar-light hover:bg-white/5">
                    Entrar
                  </Link>
                  <Link href="/cadastro" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm font-bold text-futvar-green hover:bg-futvar-green/10">
                    Cadastrar
                  </Link>
                </>
              )}
            </nav>
          </div>
          </>,
          document.body
        )}
      </div>
    </header>
  );
}
