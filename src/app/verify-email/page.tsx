'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function VerifyEmailRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/verificar-email');
  }, [router]);
  return (
    <div className="min-h-screen pt-28 flex items-center justify-center text-futvar-light">
      Redirecionando...
    </div>
  );
}
