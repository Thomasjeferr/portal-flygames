'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface Subscription {
  active: boolean;
  endDate: string | null;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = pathname.startsWith('/admin');
  const isAuthPage = ['/entrar', '/cadastro', '/recuperar-senha', '/admin/entrar'].some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (isAdmin) return;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user ?? null);
        setSubscription(data.subscription ?? null);
      })
      .catch(() => {});
  }, [isAdmin, pathname]);

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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-futvar-darker/95 backdrop-blur-md border-b border-futvar-green/10 animate-slide-down">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-12 py-3 sm:py-4 max-w-[1920px] mx-auto">
        <Link href="/" className="flex items-center gap-2 group min-w-0 shrink-0">
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
            <nav className="hidden md:flex items-center gap-4 lg:gap-6">
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
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 text-sm text-futvar-light hover:text-white max-w-[180px] sm:max-w-none"
                >
                  <span className="w-8 h-8 rounded bg-netflix-gray flex items-center justify-center text-white font-semibold shrink-0">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden sm:inline truncate">{user.name || user.email}</span>
                </button>
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                      aria-hidden
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 py-2 bg-futvar-dark border border-futvar-green/20 rounded-xl shadow-xl z-20">
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
                  </>
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

        {!isAuthPage && mobileMenuOpen && (
          <div className="absolute inset-x-0 top-full md:hidden bg-futvar-darker border-b border-futvar-green/20 shadow-xl">
            <nav className="flex flex-col p-4 gap-1 max-h-[70vh] overflow-y-auto">
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
              {user ? (
                <>
                  <div className="px-4 py-2 text-sm text-futvar-light border-b border-white/10">
                    <p className="font-medium text-white truncate">{user.name || user.email}</p>
                    {subscription && (
                      <p className={`text-xs mt-0.5 ${subscription.active ? 'text-green-400' : 'text-amber-400'}`}>
                        {subscription.active ? 'Assinatura ativa' : 'Assinatura inativa'}
                      </p>
                    )}
                  </div>
                  <Link href="/painel-time" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 rounded-lg text-sm text-futvar-light hover:bg-white/5">
                    Área do time
                  </Link>
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
        )}
      </div>
    </header>
  );
}
