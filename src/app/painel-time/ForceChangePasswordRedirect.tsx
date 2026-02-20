'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function ForceChangePasswordRedirect({ mustChangePassword }: { mustChangePassword: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!mustChangePassword) return;
    if (pathname === '/painel-time/alterar-senha') return;
    router.replace('/painel-time/alterar-senha');
  }, [mustChangePassword, pathname, router]);

  return null;
}
