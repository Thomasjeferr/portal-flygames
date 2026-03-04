'use client';

import { useStoreApp } from '@/lib/StoreAppContext';
import { GameCard } from '@/components/GameCard';

type PreSaleGame = {
  id: string;
  slug: string;
  title: string;
  fundedClubsCount: number;
  thumbnailUrl: string | null;
  createdAt: string;
};

export function PreEstreiaCards({ games }: { games: PreSaleGame[] }) {
  const isStoreApp = useStoreApp();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
      {games.map((g, i) => {
        const patrocinioOk = g.fundedClubsCount === 2;
        return (
          <div key={g.id} className="animate-scale-in opacity-0" style={{ animationDelay: `${0.15 + i * 0.05}s` }}>
            <GameCard
              slug={g.slug}
              title={g.title}
              championship={patrocinioOk ? 'Financiados: 2/2' : `Financiados: ${g.fundedClubsCount}/2`}
              thumbnailUrl={g.thumbnailUrl}
              gameDate={g.createdAt}
              featured={false}
              href={isStoreApp ? `/pre-estreia/assistir/${g.slug}` : `/pre-estreia/${g.id}/checkout`}
              badgeText={isStoreApp ? undefined : (patrocinioOk ? undefined : 'APOIAR')}
              showAssistir={!patrocinioOk}
              sponsorOkLabel={patrocinioOk ? 'Patrocínio OK' : undefined}
              sponsorOkSubtitle={patrocinioOk ? (isStoreApp ? 'Em breve disponível.' : 'Em breve disponível para membros dos clubes e assinantes.') : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
