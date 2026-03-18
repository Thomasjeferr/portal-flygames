import { prisma } from '@/lib/db';
import { isTeamOwner } from '@/lib/access';

export type ResolvedSlot =
  | { ok: true; slotId: string; slotIndex: number; teamIdForSlot: string }
  | { ok: false; error: string; code?: 'NOT_OWNER' | 'ALREADY_PAID' | 'NO_TEAMS' | 'NO_SLOT' };

/**
 * Qual slot (1 = mandante, 2 = visitante) o responsável logado deve pagar neste jogo.
 */
export async function resolveSlotForResponsible(
  preSaleGameId: string,
  userId: string
): Promise<ResolvedSlot> {
  const game = await prisma.preSaleGame.findUnique({
    where: { id: preSaleGameId },
    include: { clubSlots: { orderBy: { slotIndex: 'asc' } } },
  });
  if (!game) return { ok: false, error: 'Jogo não encontrado', code: 'NO_SLOT' };
  if (!game.homeTeamId || !game.awayTeamId) {
    return {
      ok: false,
      error:
        'Este jogo precisa ter time mandante e visitante definidos. Entre em contato com o administrador.',
      code: 'NO_TEAMS',
    };
  }

  const [ownsHome, ownsAway] = await Promise.all([
    isTeamOwner(userId, game.homeTeamId),
    isTeamOwner(userId, game.awayTeamId),
  ]);
  if (!ownsHome && !ownsAway) {
    return { ok: false, error: 'Você não é responsável por nenhum dos times desta pré-estreia.', code: 'NOT_OWNER' };
  }

  const slot1 = game.clubSlots.find((s) => s.slotIndex === 1);
  const slot2 = game.clubSlots.find((s) => s.slotIndex === 2);
  if (!slot1 || !slot2) return { ok: false, error: 'Slots do jogo não configurados.', code: 'NO_SLOT' };

  let slot = null as (typeof slot1) | null;
  if (ownsHome && !ownsAway) {
    slot = slot1;
  } else if (ownsAway && !ownsHome) {
    slot = slot2;
  } else {
    if (slot1.paymentStatus === 'PENDING') slot = slot1;
    else if (slot2.paymentStatus === 'PENDING') slot = slot2;
    else {
      return {
        ok: false,
        error: 'Os dois slots deste jogo já foram pagos.',
        code: 'ALREADY_PAID',
      };
    }
  }

  if (slot.paymentStatus === 'PAID') {
    return {
      ok: false,
      error:
        ownsHome && !ownsAway
          ? 'O slot do time mandante já foi pago.'
          : ownsAway && !ownsHome
            ? 'O slot do time visitante já foi pago.'
            : 'O slot do seu time neste jogo já foi pago.',
      code: 'ALREADY_PAID',
    };
  }

  const teamIdForSlot = slot.slotIndex === 1 ? game.homeTeamId : game.awayTeamId;
  return {
    ok: true,
    slotId: slot.id,
    slotIndex: slot.slotIndex,
    teamIdForSlot,
  };
}
