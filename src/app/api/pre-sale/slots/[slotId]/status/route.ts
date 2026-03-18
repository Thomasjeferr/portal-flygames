import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getWooviChargeStatus } from '@/lib/payments/woovi';
import { markSlotAsPaid } from '@/services/pre-sale-slot.service';
import { createClubViewerAccountForSlot } from '@/services/club-viewer.service';
import { Provider } from '@/lib/pre-sale/enums';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slotId: string }> },
) {
  const { slotId } = await params;

  let slot = await prisma.preSaleClubSlot.findUnique({
    where: { id: slotId },
    select: {
      id: true,
      paymentStatus: true,
      paymentProvider: true,
      paymentReference: true,
      preSaleGameId: true,
      preSaleGame: { select: { fundedClubsCount: true } },
    },
  });

  if (!slot) {
    return NextResponse.json({ error: 'Slot não encontrado' }, { status: 404 });
  }

  // Fallback automático: se ainda está PENDING mas temos cobrança Woovi,
  // consulta o status direto na Woovi e, se estiver COMPLETED, marca como pago.
  if (
    slot.paymentStatus === 'PENDING' &&
    slot.paymentProvider === 'WOOVI' &&
    slot.paymentReference
  ) {
    try {
      const charge = await getWooviChargeStatus(slot.paymentReference);
      const status = charge?.status?.toUpperCase?.() ?? '';
      if (status === 'COMPLETED') {
        await markSlotAsPaid(slot.id, Provider.WOOVI, slot.paymentReference);
        await createClubViewerAccountForSlot(slot.id);
        // Recarrega slot já com estado atualizado
        slot = await prisma.preSaleClubSlot.findUnique({
          where: { id: slotId },
          select: {
            paymentStatus: true,
            preSaleGame: { select: { fundedClubsCount: true } },
          },
        }) as typeof slot;
      }
    } catch (e) {
      console.error('[pre-sale][slot-status] erro ao sincronizar Woovi:', e);
    }
  }

  return NextResponse.json({
    paymentStatus: slot.paymentStatus,
    fundedClubsCount: slot.preSaleGame?.fundedClubsCount ?? 0,
    totalClubs: 2,
  });
}

