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
  const [menuOpen, setMenuOpen] = useState(false);

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
    setMenuOpen(false);
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
        <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <Link href="/admin/entrar" className="text-2xl font-bold text-netflix-red">
            Fly Games Admin
          </Link>
          <Link href="/" className="text-sm text-futvar-light hover:text-white">
            Voltar ao site
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-futvar-darker/95 backdrop-blur-md border-b border-futvar-green/10">
      <div className="flex items-center justify-between px-6 lg:px-12 py-4 max-w-[1920px] mx-auto">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl group-hover:scale-110 transition-transform">⚽</span>
          <span className="text-2xl lg:text-3xl font-bold text-futvar-green tracking-tight">
            FLY GAMES
          </span>
        </Link>

        {!isAuthPage && (
          <nav className="flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm font-semibold ${pathname === '/' ? 'text-futvar-green' : 'text-futvar-light hover:text-white'}`}
            >
              Início
            </Link>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 text-sm text-futvar-light hover:text-white"
                >
                  <span className="w-8 h-8 rounded bg-netflix-gray flex items-center justify-center text-white font-semibold">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </span>
                  {user.name || user.email}
                </button>
                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
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
                        href="/conta"
                        className="block px-4 py-2 text-sm text-futvar-light hover:bg-white/5"
                        onClick={() => setMenuOpen(false)}
                      >
                        Minha conta
                      </Link>
                      <Link
                        href="/planos"
                        className="block px-4 py-2 text-sm text-futvar-light hover:bg-white/5"
                        onClick={() => setMenuOpen(false)}
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
                  className="px-5 py-2.5 rounded-lg bg-futvar-green text-futvar-darker text-sm font-bold hover:bg-futvar-green-light transition-colors"
                >
                  Cadastrar
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
