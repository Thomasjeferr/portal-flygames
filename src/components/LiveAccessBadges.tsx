'use client';

import { useStoreApp } from '@/lib/StoreAppContext';

interface Props {
  requireSubscription: boolean;
  allowOneTimePurchase: boolean;
}

/** No app lojas: não mostra texto que remeta a assinatura ou compra. */
export function LiveAccessBadges({ requireSubscription, allowOneTimePurchase }: Props) {
  const isStoreApp = useStoreApp();

  if (isStoreApp) {
    return (
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs md:text-sm">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0a1f1a]/80 border border-emerald-400/30 text-emerald-100/90">
          <span className="w-2 h-2 rounded-full bg-[#19d37a]" />
          Transmissão
        </span>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs md:text-sm">
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0a1f1a]/80 border border-emerald-400/30 text-emerald-100/90">
        <span className="w-2 h-2 rounded-full bg-[#19d37a]" />
        {requireSubscription ? 'Disponível para assinantes' : 'Disponível sem assinatura'}
      </span>
      {allowOneTimePurchase && (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#0a1f1a]/80 border border-amber-400/40 text-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Acesso avulso disponível
        </span>
      )}
    </div>
  );
}
