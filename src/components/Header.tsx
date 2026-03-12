'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { formatLiveDatetimeDisplay } from '@/lib/liveTimezone';
import { useStoreApp } from '@/lib/StoreAppContext';

function IconAndroid({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48a5.493 5.493 0 0 0-2.64-.66c-.99 0-1.93.23-2.76.66L8.88 1.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.3 1.3a5.49 5.49 0 0 0-2.32 4.49H18c0-1.79-.89-3.37-2.24-4.33zM12 6.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
    </svg>
  );
}

function IconApple({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

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
  const [androidModalOpen, setAndroidModalOpen] = useState(false);
  const [iosModalOpen, setIosModalOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const isStoreApp = useStoreApp();

  const isAdmin = pathname.startsWith('/admin');
  const isAuthPage = ['/entrar', '/cadastro', '/recuperar-senha', '/admin/entrar'].some((p) => pathname.startsWith(p));

  const [isPartner, setIsPartner] = useState(false);
  const [accountTypeLabels, setAccountTypeLabels] = useState<string[]>([]);

  const fetchUser = useCallback(() => {
    if (isAdmin) return;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object' && !data.error) {
          setUser(data.user ?? null);
          setSubscription(data.subscription ?? null);
          setIsPartner(!!data.isPartner);
          setAccountTypeLabels(Array.isArray(data.accountTypeLabels) ? data.accountTypeLabels : []);
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
    if (typeof window === 'undefined') return;
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
  }, []);

  useEffect(() => {
    if (isAdmin) return;
    const fetchLiveHighlight = () => {
      fetch('/api/public/live-highlight', { cache: 'no-store' })
        .then((r) => r.json())
        .then((data: LiveHighlight) => {
          if (!data || !data.mode) return;
          setLiveHighlight(data);
        })
        .catch(() => {});
    };
    fetchLiveHighlight();
    const interval = setInterval(fetchLiveHighlight, 45_000); // 45 segundos
    return () => clearInterval(interval);
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
      <div className="relative flex items-center flex-1 justify-center min-w-0 mx-2 md:mx-0 md:flex-initial md:justify-start md:mr-4">
        <button
          type="button"
          onClick={() => setLivePreviewOpen((o) => !o)}
          className={`flex items-center gap-1.5 md:gap-2 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full border text-[10px] md:text-xs font-semibold shadow-sm transition-colors shrink-0 ${
            liveHighlight.mode === 'LIVE'
              ? 'border-red-500 bg-red-600 text-white hover:bg-red-500 shadow-red-500/30 shadow-md'
              : 'border-amber-400/60 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
          }`}
        >
          <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5 shrink-0">
            {liveHighlight.mode === 'LIVE' && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 animate-ping opacity-70" />
            )}
            <span
              className={`relative inline-flex rounded-full h-full w-full ${
                liveHighlight.mode === 'LIVE'
                  ? 'bg-red-300 animate-live-blink'
                  : 'bg-amber-200'
              }`}
            />
          </span>
          <span className="uppercase tracking-wide truncate">
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
                {formatLiveDatetimeDisplay(liveHighlight.live.startAt)}
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
            {!isStoreApp && (
              <>
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
                <Link
                  href="/torneios"
                  className={`text-sm font-semibold ${pathname.startsWith('/torneios') ? 'text-futvar-green' : 'text-futvar-light hover:text-white'}`}
                >
                  Campeonatos
                </Link>
              </>
            )}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-sm text-futvar-light hover:text-white max-w-[180px] sm:max-w-none"
                  aria-label={`Menu de ${user.name || user.email}. Tipo de conta: ${accountTypeLabels.join(', ') || 'Conta pessoal'}`}
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
                  {accountTypeLabels.length > 0 && (
                    <span className="hidden lg:inline-flex flex-wrap gap-1">
                      {accountTypeLabels.map((label) => (
                        <span
                          key={label}
                          className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-futvar-green/20 text-futvar-green border border-futvar-green/40"
                        >
                          {label}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
                {userMenuOpen &&
                  typeof document !== 'undefined' &&
                  createPortal(
                    <button
                      type="button"
                      className="fixed inset-0 z-40 cursor-default"
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
                      {accountTypeLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {accountTypeLabels.map((label) => (
                            <span
                              key={label}
                              className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-futvar-green/20 text-futvar-green border border-futvar-green/40"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                      {subscription && (
                        <div className="mt-1">
                          <p className={`text-xs ${subscription.active ? 'text-green-400' : 'text-amber-400'}`}>
                            {isStoreApp ? (subscription.active ? 'Acesso ativo' : 'Acesso inativo') : (subscription.active ? 'Assinatura ativa' : 'Sua assinatura ou período de degustação acabou.')}
                          </p>
                          {!subscription.active && !isStoreApp && (
                            <Link
                              href="/planos"
                              className="text-xs mt-1 inline-block text-futvar-green hover:underline font-medium"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              Assine um plano para continuar
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                    {!isStoreApp && (
                      <>
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
                      </>
                    )}
                    {!isStoreApp && isPartner && (
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
                    {!isStoreApp && (
                    <Link
                      href="/planos"
                      className="block px-4 py-2 text-sm text-futvar-light hover:bg-white/5"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      Planos
                    </Link>
                    )}
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
                {!isStoreApp && (
                <Link
                  href="/cadastro"
                  className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-futvar-green text-futvar-darker text-sm font-bold hover:bg-futvar-green-light transition-colors whitespace-nowrap"
                >
                  Cadastrar
                </Link>
                )}
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
              {!isStoreApp && (
                <>
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
                  <Link
                    href="/torneios"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-lg text-sm font-semibold ${pathname.startsWith('/torneios') ? 'text-futvar-green bg-futvar-green/10' : 'text-futvar-light hover:bg-white/5'}`}
                  >
                    Campeonatos
                  </Link>
                </>
              )}
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
                      {accountTypeLabels.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {accountTypeLabels.map((label) => (
                            <span
                              key={label}
                              className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-futvar-green/20 text-futvar-green border border-futvar-green/40"
                            >
                              {label}
                            </span>
                          ))}
                        </div>
                      )}
                    {subscription && (
                      <div className="mt-0.5">
                        <p className={`text-xs ${subscription.active ? 'text-green-400' : 'text-amber-400'}`}>
                          {isStoreApp ? (subscription.active ? 'Acesso ativo' : 'Acesso inativo') : (subscription.active ? 'Assinatura ativa' : 'Sua assinatura ou período de degustação acabou.')}
                        </p>
                        {!subscription.active && !isStoreApp && (
                          <Link
                            href="/planos"
                            className="text-xs mt-1 inline-block text-futvar-green hover:underline font-medium"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Assine um plano para continuar
                          </Link>
                        )}
                      </div>
                    )}
                    </div>
                  </div>
                  {!isStoreApp && (
                    <Link href="/painel-time" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm text-futvar-light hover:bg-white/5">
                      Área do time
                    </Link>
                  )}
                  {!isStoreApp && isPartner && (
                    <Link href="/parceiro" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm text-futvar-light hover:bg-white/5">
                      Dashboard Parceiro
                    </Link>
                  )}
                  <Link href="/conta" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm text-futvar-light hover:bg-white/5">
                    Minha conta
                  </Link>
                  {!isStoreApp && (
                  <Link href="/planos" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm text-futvar-light hover:bg-white/5">
                    Planos
                  </Link>
                  )}
                  {!isStandalone && !isStoreApp && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setAndroidModalOpen(true);
                        }}
                        className="px-4 py-3 rounded-lg text-sm font-semibold text-futvar-light hover:bg-white/5 text-left flex items-center gap-3 w-full"
                      >
                        <IconAndroid className="w-6 h-6 text-[#3DDC84]" />
                        Android — Baixar e instalar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          setIosModalOpen(true);
                        }}
                        className="px-4 py-3 rounded-lg text-sm font-semibold text-futvar-light hover:bg-white/5 text-left flex items-center gap-3 w-full"
                      >
                        <IconApple className="w-6 h-6 text-white" />
                        iPhone / iPad — Tela inicial
                      </button>
                    </>
                  )}
                  <button onClick={handleLogout} className="px-4 py-3 rounded-lg text-sm text-futvar-light hover:bg-red-900/20 hover:text-red-300 text-left">
                    Sair
                  </button>
                </>
              ) : (
                <>
                  {!isStandalone && !isStoreApp && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setMobileMenuOpen(false); setAndroidModalOpen(true); }}
                        className="px-4 py-3 rounded-lg text-sm font-semibold text-futvar-light hover:bg-white/5 text-left flex items-center gap-3 w-full"
                      >
                        <IconAndroid className="w-6 h-6 text-[#3DDC84]" />
                        Android — Baixar e instalar
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMobileMenuOpen(false); setIosModalOpen(true); }}
                        className="px-4 py-3 rounded-lg text-sm font-semibold text-futvar-light hover:bg-white/5 text-left flex items-center gap-3 w-full"
                      >
                        <IconApple className="w-6 h-6 text-white" />
                        iPhone / iPad — Tela inicial
                      </button>
                    </>
                  )}
                  <Link href="/entrar" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm text-futvar-light hover:bg-white/5">
                    Entrar
                  </Link>
                  {!isStoreApp && (
                  <Link href="/cadastro" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm font-bold text-futvar-green hover:bg-futvar-green/10">
                    Cadastrar
                  </Link>
                  )}
                </>
              )}
            </nav>
          </div>
          </>,
          document.body
        )}

        {androidModalOpen && typeof document !== 'undefined' && createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[9998] bg-black/60 cursor-default"
              onClick={() => setAndroidModalOpen(false)}
              aria-label="Fechar"
            />
            <div className="fixed left-1/2 top-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-futvar-darker border border-futvar-green/30 shadow-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <IconAndroid className="w-7 h-7 text-[#3DDC84]" />
                Android — Baixar e instalar
              </h3>
              <p className="text-sm text-futvar-light mb-4">
                Baixe o app Fly Games no seu celular Android e instale. Se o sistema pedir, permita &quot;instalação de fontes desconhecidas&quot; para o navegador ou arquivos. Se aparecer o aviso do Play Protect, toque em <strong>Instalar mesmo assim</strong>.
              </p>
              <a
                href="/downloads/flygames.apk"
                download
                className="mt-4 w-full inline-flex justify-center py-3 rounded-lg bg-[#3DDC84] text-gray-900 font-semibold hover:opacity-90 transition-opacity"
              >
                Baixar e instalar
              </a>
              <button
                type="button"
                onClick={() => setAndroidModalOpen(false)}
                className="mt-3 w-full py-2.5 rounded-lg border border-futvar-green/40 text-futvar-light font-medium hover:bg-white/5 transition-colors"
              >
                Fechar
              </button>
            </div>
          </>,
          document.body
        )}

        {iosModalOpen && typeof document !== 'undefined' && createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[9998] bg-black/60 cursor-default"
              onClick={() => setIosModalOpen(false)}
              aria-label="Fechar"
            />
            <div className="fixed left-1/2 top-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-futvar-darker border border-futvar-green/30 shadow-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <IconApple className="w-7 h-7 text-white" />
                iPhone / iPad — Fixar na tela inicial
              </h3>
              <p className="text-sm text-futvar-light mb-4">
                Use o <strong>Safari</strong> para abrir este site. Depois:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-futvar-light mb-6">
                <li>Toque no ícone <strong>Compartilhar</strong> (□↑) na barra inferior do Safari.</li>
                <li>Role e escolha <strong>Adicionar à Tela de Início</strong>.</li>
                <li>Toque em <strong>Adicionar</strong>. O ícone do Fly Games aparecerá na tela inicial.</li>
              </ol>
              <button
                type="button"
                onClick={() => setIosModalOpen(false)}
                className="w-full py-3 rounded-lg bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light transition-colors"
              >
                Entendi
              </button>
            </div>
          </>,
          document.body
        )}
      </div>

      {!isStoreApp && user && subscription && !subscription.active && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2">
          <div className="max-w-[1920px] mx-auto flex flex-wrap items-center justify-center gap-2 sm:gap-4 sm:justify-between text-center sm:text-left">
            <p className="text-amber-200 text-sm font-medium">
              Sua assinatura ou período de degustação acabou. Assine um plano para continuar assistindo.
            </p>
            <Link
              href="/planos"
              className="shrink-0 inline-flex px-4 py-1.5 rounded-lg bg-futvar-green text-futvar-darker text-sm font-semibold hover:bg-futvar-green-light transition-colors"
            >
              Ver planos
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
