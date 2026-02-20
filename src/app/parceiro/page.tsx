'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ParceiroIndexPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/parceiro/link');
  }, [router]);
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <p className="text-futvar-light">Redirecionando...</p>
    </div>
  );
}
