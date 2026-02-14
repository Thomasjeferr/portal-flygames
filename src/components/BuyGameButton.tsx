'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface BuyGameButtonProps {
  gameId: string;
  className?: string;
}

export function BuyGameButton({ gameId, className }: BuyGameButtonProps) {
  const [unitarioPlanId, setUnitarioPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then((data: Array<{ id: string; type: string }>) => {
        const unitario = Array.isArray(data) ? data.find((p) => p.type === 'unitario') : null;
        setUnitarioPlanId(unitario?.id ?? null);
      })
      .catch(() => {});
  }, []);

  if (!unitarioPlanId) return null;

  return (
    <Link
      href={`/checkout?planId=${unitarioPlanId}&gameId=${gameId}`}
      className={className ?? 'inline-block px-6 py-3 rounded-lg border-2 border-futvar-green/50 text-futvar-green font-bold hover:bg-futvar-green/10 transition-colors'}
    >
      Comprar este jogo
    </Link>
  );
}
