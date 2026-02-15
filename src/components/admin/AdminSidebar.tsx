'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const menuItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📍' },
  { href: '/admin/jogos', label: 'Jogos', icon: '▶' },
  { href: '/admin/pre-estreia', label: 'Pré-estreia', icon: '🎬' },
  { href: '/admin/categorias', label: 'Categorias', icon: '📁' },
  { href: '/admin/banner', label: 'Hero Banners', icon: '🖼' },
  { href: '/admin/sponsors', label: 'Patrocinadores', icon: '🏆' },
  { href: '/admin/usuarios', label: 'Usuários', icon: '👥' },
  { href: '/admin/planos', label: 'Planos', icon: '📋' },
  { href: '/admin/pagamentos', label: 'APIs de Pagamento', icon: '💳' },
  { href: '/admin/emails/settings', label: 'E-mails', icon: '✉' },
  { href: '/admin/settings', label: 'Configurações', icon: '⚙' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/entrar');
    router.refresh();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-netflix-dark border border-white/20 text-white"
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
      >
        {open ? '✕' : '☰'}
      </button>
      <aside
        className={`fixed left-0 top-0 bottom-0 w-64 bg-netflix-dark border-r border-white/10 flex flex-col z-40 transition-transform duration-200 ease-out lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
      <div className="p-6 border-b border-white/10">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="text-xl font-bold text-netflix-red tracking-tight">Fly Games</span>
        </Link>
        <p className="text-xs text-netflix-light mt-1">Painel administrativo</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
          const className = `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? 'bg-netflix-red/20 text-netflix-red border border-netflix-red/30'
              : 'text-netflix-light hover:bg-white/5 hover:text-white'
          }`;
          if (item.href === '/admin') {
            return (
              <a
                key={item.href}
                href="/admin"
                onClick={() => setOpen(false)}
                className={className}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </a>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={className}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-1">
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-netflix-light hover:bg-white/5 hover:text-white transition-colors"
        >
          <span>🌐</span>
          Ver site
        </Link>
        <button
          onClick={() => { setOpen(false); handleLogout(); }}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm text-netflix-light hover:bg-red-900/20 hover:text-red-300 transition-colors text-left"
        >
          <span>↪</span>
          Sair
        </button>
      </div>
    </aside>
    {open && (
      <div
        className="fixed inset-0 bg-black/60 z-30 lg:hidden"
        onClick={() => setOpen(false)}
        aria-hidden
      />
    )}
    </>
  );
}
