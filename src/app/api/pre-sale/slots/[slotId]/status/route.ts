import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slotId: string }> },
) {
  const { slotId } = await params;

  const slot = await prisma.preSaleClubSlot.findUnique({
    where: { id: slotId },
    select: {
      paymentStatus: true,
      preSaleGame: { select: { fundedClubsCount: true } },
    },
  });

  if (!slot) {
    return NextResponse.json({ error: 'Slot não encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    paymentStatus: slot.paymentStatus,
    fundedClubsCount: slot.preSaleGame?.fundedClubsCount ?? 0,
    totalClubs: 2,
  });
}

