'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const menuItems = [
  { href: '/admin/jogos', label: 'Jogos', icon: '▶' },
  { href: '/admin/usuarios', label: 'Usuários', icon: '👥' },
  { href: '/admin/planos', label: 'Planos', icon: '📋' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/entrar');
    router.refresh();
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-netflix-dark border-r border-white/10 flex flex-col z-40">
      <div className="p-6 border-b border-white/10">
        <Link href="/admin/jogos" className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <span className="text-xl font-bold text-netflix-red tracking-tight">Fly Games</span>
        </Link>
        <p className="text-xs text-netflix-light mt-1">Painel administrativo</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-netflix-red/20 text-netflix-red border border-netflix-red/30'
                  : 'text-netflix-light hover:bg-white/5 hover:text-white'
              }`}
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
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-netflix-light hover:bg-white/5 hover:text-white transition-colors"
        >
          <span>🌐</span>
          Ver site
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm text-netflix-light hover:bg-red-900/20 hover:text-red-300 transition-colors text-left"
        >
          <span>↪</span>
          Sair
        </button>
      </div>
    </aside>
  );
}
