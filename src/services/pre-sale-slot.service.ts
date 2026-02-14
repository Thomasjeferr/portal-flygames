import { prisma } from '@/lib/db';
import { PaymentStatus, Provider } from '@/lib/pre-sale/enums';
import { recalculatePreSaleGameStatus } from './pre-sale-status.service';

/**
 * Marca slot como pago (chamado pelos webhooks).
 * Idempotente: se já PAID, retorna sem alterar.
 */
export async function markSlotAsPaid(
  slotIdOrReference: string,
  provider: Provider,
  reference: string
) {
  return prisma.$transaction(async (tx) => {
    const slot = await tx.preSaleClubSlot.findFirst({
      where: {
        OR: [{ id: slotIdOrReference }, { paymentReference: slotIdOrReference }],
      },
      include: { preSaleGame: true },
    });
    if (!slot) return null;
    if (slot.paymentStatus === PaymentStatus.PAID) return slot;

    const updated = await tx.preSaleClubSlot.update({
      where: { id: slot.id },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paymentProvider: provider,
        paymentReference: reference,
        paidAt: new Date(),
      },
    });

    await recalculatePreSaleGameStatus(slot.preSaleGameId, tx);
    return updated;
  });
}

/**
 * Marca slot como estornado (REGRA 5).
 */
export async function markSlotAsRefunded(slotIdOrReference: string) {
  return prisma.$transaction(async (tx) => {
    const slot = await tx.preSaleClubSlot.findFirst({
      where: {
        OR: [{ id: slotIdOrReference }, { paymentReference: slotIdOrReference }],
      },
    });
    if (!slot) return null;

    await tx.preSaleClubSlot.update({
      where: { id: slot.id },
      data: {
        paymentStatus: PaymentStatus.PENDING,
        paymentProvider: null,
        paymentReference: null,
        paidAt: null,
      },
    });

    await recalculatePreSaleGameStatus(slot.preSaleGameId, tx);
    return slot;
  });
}
