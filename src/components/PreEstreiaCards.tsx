'use client';

import { useStoreApp } from '@/lib/StoreAppContext';
import { GameCard } from '@/components/GameCard';

type TeamInfo = { id: string; name: string; shortName: string | null; crestUrl: string | null };

type PreSaleGame = {
  id: string;
  slug: string;
  title: string;
  fundedClubsCount: number;
  thumbnailUrl: string | null;
  createdAt: string;
  homeTeam?: TeamInfo | null;
  awayTeam?: TeamInfo | null;
};

export function PreEstreiaCards({ games }: { games: PreSaleGame[] }) {
  const isStoreApp = useStoreApp();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5 items-stretch">
      {games.map((g, i) => {
        const patrocinioOk = g.fundedClubsCount === 2;
        const showTeams = g.homeTeam && g.awayTeam;
        // Quando ainda não está financiado (2/2), sempre manda para a página de pré-estreia [id],
        // para o responsável pelo time ver o fluxo de pagamento (mobile ou desktop). Só usa "assistir"
        // quando o jogo já está disponível para assistir (patrocínio ok).
        const cardHref =
          patrocinioOk
            ? (isStoreApp ? `/pre-estreia/assistir/${g.slug}` : `/pre-estreia/${g.id}`)
            : `/pre-estreia/${g.id}`;

        return (
          <div key={g.id} className="h-full flex flex-col animate-scale-in opacity-0" style={{ animationDelay: `${0.15 + i * 0.05}s` }}>
            <GameCard
              slug={g.slug}
              title={g.title}
              championship={patrocinioOk ? 'Financiados: 2/2' : `Financiados: ${g.fundedClubsCount}/2`}
              thumbnailUrl={g.thumbnailUrl}
              gameDate={g.createdAt}
              featured={false}
              href={cardHref}
              badgeText={isStoreApp ? undefined : (patrocinioOk ? undefined : 'RESP. DO TIME')}
              showAssistir={!patrocinioOk}
              sponsorOkLabel={patrocinioOk ? 'Patrocínio OK' : undefined}
              sponsorOkSubtitle={
                patrocinioOk
                  ? isStoreApp
                    ? 'Em breve disponível.'
                    : 'Em breve disponível para membros dos clubes e assinantes.'
                  : 'Responsáveis do mandante ou visitante pagam o slot aqui.'
              }
              homeTeam={showTeams ? g.homeTeam : undefined}
              awayTeam={showTeams ? g.awayTeam : undefined}
              preEstreiaClubes
            />
          </div>
        );
      })}
    </div>
  );
}
