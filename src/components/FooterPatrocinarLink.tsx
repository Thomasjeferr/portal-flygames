'use client';

import Link from 'next/link';
import { useStoreApp } from '@/lib/StoreAppContext';

export function FooterPatrocinarLink() {
  const isStoreApp = useStoreApp();
  if (isStoreApp) return null;
  return (
    <Link href="/patrocinar" className="text-sm text-futvar-green hover:text-futvar-green-light font-medium">
      Seja um Patrocinador →
    </Link>
  );
}
