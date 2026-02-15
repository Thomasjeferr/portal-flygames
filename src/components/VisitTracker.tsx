'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/admin')) return;
    fetch('/api/track-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pagePath: pathname || '/',
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}
