import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { GameStatus } from '@/lib/pre-sale/enums';

/**
 * Recalcula status e funded_clubs_count do jogo.
 * REGRA 2: Ambos PAID -> FUNDED
 * REGRA 3: FUNDED + video_url -> PUBLISHED
 * REGRA 5: Estorno -> PRE_SALE
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

    const paidCount = game.clubSlots.filter((s: { paymentStatus: string }) => s.paymentStatus === 'PAID').length;
    const hasVideo = !!game.videoUrl?.trim();
    let newStatus = game.status;

    if (paidCount < 2) newStatus = GameStatus.PRE_SALE;
    else if (paidCount === 2 && !hasVideo) newStatus = GameStatus.FUNDED;
    else if (paidCount === 2 && hasVideo) newStatus = GameStatus.PUBLISHED;

    return client.preSaleGame.update({
      where: { id: preSaleGameId },
      data: { fundedClubsCount: paidCount, status: newStatus },
    });
  };

  if (tx) return run(tx);
  return prisma.$transaction((t) => run(t));
}
