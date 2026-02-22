'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const menuItems = [
  { href: '/admin', label: 'Dashboard', icon: 'chart' },
  { href: '/admin/analytics', label: 'Analytics', icon: 'pin' },
  { href: '/admin/jogos', label: 'Jogos', icon: 'play' },
  { href: '/admin/sumulas', label: 'Súmula', icon: 'clipboard' },
  { href: '/admin/times', label: 'Times', icon: 'team' },
  { href: '/admin/lives', label: 'Lives', icon: 'broadcast' },
  { href: '/admin/pre-estreia', label: 'Pré-estreia', icon: 'film' },
  { href: '/admin/categorias', label: 'Categorias', icon: 'folder' },
  { href: '/admin/banner', label: 'Hero Banners', icon: 'image' },
  { href: '/admin/sponsors', label: 'Patrocinadores', icon: 'trophy' },
  { href: '/admin/sponsor-orders', label: 'Pedidos de patrocínio', icon: 'receipt' },
  { href: '/admin/patrocinios-por-time', label: 'Patrocínios por time', icon: 'chart' },
  { href: '/admin/partners', label: 'Parceiros', icon: 'users' },
  { href: '/admin/usuarios', label: 'Usuários', icon: 'users' },
  { href: '/admin/planos', label: 'Planos', icon: 'clipboard' },
  { href: '/admin/pagamentos', label: 'APIs de Pagamento', icon: 'card' },
  { href: '/admin/emails/settings', label: 'E-mails', icon: 'mail' },
  { href: '/admin/settings', label: 'Configurações', icon: 'cog' },
];

function MenuIcon({ name, className }: { name: string; className?: string }) {
  const c = className ?? 'w-4 h-4 opacity-60';
  const svg = (path: string) => (
    <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
  switch (name) {
    case 'chart': return svg('M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z');
    case 'pin': return svg('M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z');
    case 'play': return svg('M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z');
    case 'broadcast': return svg('M18.364 5.636a9 9 0 010 12.728m0-12.728a9 9 0 000 12.728m-12.728-9a9 9 0 010 12.728m0-12.728a9 9 0 000 12.728M9 12a3 3 0 116 0 3 3 0 01-6 0z');
    case 'team': return svg('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z');
    case 'film': return svg('M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z');
    case 'folder': return svg('M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z');
    case 'image': return svg('M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z');
    case 'trophy': return svg('M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z');
    case 'users': return svg('M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z');
    case 'clipboard': return svg('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2');
    case 'receipt': return svg('M7 5h10a2 2 0 012 2v10.5a.5.5 0 01-.8.4L17 17l-1.2.9a1 1 0 01-1.2 0L13.4 17l-1.2.9a1 1 0 01-1.2 0L9.8 17 8.6 17.9a1 1 0 01-1.2 0L5 17.5V7a2 2 0 012-2zm2 4.5h6m-6 3h4');
    case 'card': return svg('M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z');
    case 'mail': return svg('M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z');
    case 'cog': return svg('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z');
    case 'globe': return svg('M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9');
    case 'logout': return svg('M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1');
    default: return null;
  }
}

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
          <img src="/uploads/logo-home-fly.png" alt="FLY GAMES" className="h-8 w-auto object-contain" />
        </Link>
        <p className="text-xs text-netflix-light mt-2">Painel administrativo</p>
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
                <span className={`flex-shrink-0 ${isActive ? 'text-current opacity-90' : 'text-netflix-light opacity-60'}`}><MenuIcon name={item.icon} /></span>
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
              <span className={`flex-shrink-0 ${isActive ? 'text-current opacity-90' : 'text-netflix-light opacity-60'}`}><MenuIcon name={item.icon} /></span>
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
          <span className="flex-shrink-0 text-netflix-light opacity-60"><MenuIcon name="globe" /></span>
          Ver site
        </Link>
        <button
          onClick={() => { setOpen(false); handleLogout(); }}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm text-netflix-light hover:bg-red-900/20 hover:text-red-300 transition-colors text-left"
        >
          <span className="flex-shrink-0 text-netflix-light opacity-60"><MenuIcon name="logout" /></span>
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
