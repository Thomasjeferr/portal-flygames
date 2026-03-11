'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface BuyGameButtonProps {
  gameId: string;
  className?: string;
  /** Quando true, esconde o botão se a conta tiver assinatura ou patrocínio recorrente ativo (acesso livre ao conteúdo). */
  hideIfRecurringAccess?: boolean;
}

export function BuyGameButton({ gameId, className, hideIfRecurringAccess }: BuyGameButtonProps) {
  const [unitarioPlanId, setUnitarioPlanId] = useState<string | null>(null);
  const [hasRecurringAccess, setHasRecurringAccess] = useState<boolean | null>(
    hideIfRecurringAccess ? null : false
  );

  useEffect(() => {
    fetch('/api/plans')
      .then((r) => r.json())
      .then((data: Array<{ id: string; type: string }>) => {
        const unitario = Array.isArray(data) ? data.find((p) => p.type === 'unitario') : null;
        setUnitarioPlanId(unitario?.id ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!hideIfRecurringAccess) return;
    fetch('/api/account', { credentials: 'include' })
      .then((r) => r.json())
      .then((data: { hasActiveRecurringAccess?: boolean }) => {
        setHasRecurringAccess(!!data?.hasActiveRecurringAccess);
      })
      .catch(() => setHasRecurringAccess(false));
  }, [hideIfRecurringAccess]);

  if (hideIfRecurringAccess && hasRecurringAccess === true) return null;
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
