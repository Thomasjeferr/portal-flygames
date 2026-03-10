import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { GameStatus } from '@/lib/pre-sale/enums';

/**
 * Recalcula status e funded_clubs_count do jogo.
 * - Clubes financiam: ambos slots PAID -> FUNDED; FUNDED + video_url -> PUBLISHED.
 * - Pré-estreia Meta: quando os dois times batem a meta de assinantes (homeNew >= metaHomeTotal e awayNew >= metaAwayTotal) -> FUNDED; FUNDED + video_url -> PUBLISHED.
 */
export async function recalculatePreSaleGameStatus(
  preSaleGameId: string,
  tx?: Omit<Prisma.TransactionClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>
) {
  const run = async (client: any) => {
    const game = await client.preSaleGame.findUnique({
      where: { id: preSaleGameId },
      include: { clubSlots: true },
    });
    if (!game) return null;

    const hasVideo = !!game.videoUrl?.trim();
    let newStatus = game.status;
    let fundedClubsCount = game.fundedClubsCount ?? 0;

    if (game.metaEnabled && game.homeTeamId && game.awayTeamId && (game.metaHomeTotal != null || game.metaExtraPerTeam != null)) {
      const homeTarget = game.metaHomeTotal ?? game.metaExtraPerTeam ?? 0;
      const awayTarget = game.metaAwayTotal ?? game.metaExtraPerTeam ?? 0;
      if (homeTarget > 0 && awayTarget > 0) {
        const [homeCount, awayCount] = await Promise.all([
          client.subscription.count({
            where: {
              active: true,
              user: { favoriteTeamId: game.homeTeamId },
              plan: { type: 'recorrente' },
            },
          }),
          client.subscription.count({
            where: {
              active: true,
              user: { favoriteTeamId: game.awayTeamId },
              plan: { type: 'recorrente' },
            },
          }),
        ]);
        const baselineHome = game.baselineHomeSubs ?? 0;
        const baselineAway = game.baselineAwaySubs ?? 0;
        const homeNew = Math.max(0, homeCount - baselineHome);
        const awayNew = Math.max(0, awayCount - baselineAway);
        const metaBatida = homeNew >= homeTarget && awayNew >= awayTarget;
        if (metaBatida && !hasVideo) newStatus = GameStatus.FUNDED;
        else if (metaBatida && hasVideo) newStatus = GameStatus.PUBLISHED;
        else newStatus = GameStatus.PRE_SALE;
        fundedClubsCount = metaBatida ? 2 : 0;
      }
    } else {
      const paidCount = game.clubSlots.filter((s: { paymentStatus: string }) => s.paymentStatus === 'PAID').length;
      fundedClubsCount = paidCount;
      if (paidCount < 2) newStatus = GameStatus.PRE_SALE;
      else if (paidCount === 2 && !hasVideo) newStatus = GameStatus.FUNDED;
      else if (paidCount === 2 && hasVideo) newStatus = GameStatus.PUBLISHED;
    }

    return client.preSaleGame.update({
      where: { id: preSaleGameId },
      data: { fundedClubsCount, status: newStatus },
    });
  };

  if (tx) return run(tx);
  return prisma.$transaction((t) => run(t));
}
