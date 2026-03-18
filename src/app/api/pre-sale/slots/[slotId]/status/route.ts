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
      credentialsSentAt: true,
      preSaleGameId: true,
      preSaleGame: { select: { fundedClubsCount: true } },
    },
  });

  if (!slot) {
    return NextResponse.json({ error: 'Slot não encontrado' }, { status: 404 });
  }

  // 1) PENDING: consulta Woovi e, se COMPLETED, marca como pago e envia credenciais
  if (slot.paymentStatus === 'PENDING') {
    const refsToTry: string[] = slot.paymentReference ? [slot.paymentReference, `presale-${slot.id}`] : [`presale-${slot.id}`];
    for (const ref of refsToTry) {
      try {
        const charge = await getWooviChargeStatus(ref);
        const status = (charge?.status ?? (charge as { status?: string })?.status)?.toString?.()?.toUpperCase?.() ?? '';
        if (status === 'COMPLETED') {
          await markSlotAsPaid(slot.id, Provider.WOOVI, ref);
          await createClubViewerAccountForSlot(slot.id);
          slot = await prisma.preSaleClubSlot.findUnique({
            where: { id: slotId },
            select: {
              paymentStatus: true,
              credentialsSentAt: true,
              preSaleGame: { select: { fundedClubsCount: true } },
            },
          }) as typeof slot;
          break;
        }
      } catch (e) {
        console.error('[pre-sale][slot-status] erro ao sincronizar Woovi (ref=', ref, '):', e);
      }
    }
  }

  // 2) PAID mas credenciais nunca enviadas (ex.: webhook não rodou em localhost): envia agora
  if (slot.paymentStatus === 'PAID' && !slot.credentialsSentAt) {
    try {
      await createClubViewerAccountForSlot(slot.id);
      slot = await prisma.preSaleClubSlot.findUnique({
        where: { id: slotId },
        select: {
          paymentStatus: true,
          credentialsSentAt: true,
          preSaleGame: { select: { fundedClubsCount: true } },
        },
      }) as typeof slot;
    } catch (e) {
      console.error('[pre-sale][slot-status] erro ao enviar credenciais (slot já pago):', e);
    }
  }

  return NextResponse.json({
    paymentStatus: slot.paymentStatus,
    fundedClubsCount: slot.preSaleGame?.fundedClubsCount ?? 0,
    totalClubs: 2,
  });
}

