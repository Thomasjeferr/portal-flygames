import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { randomBytes } from 'crypto';

function generateClubCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const id = (await params).id;
  const game = await prisma.preSaleGame.findUnique({
    where: { id },
    include: { clubSlots: true },
  });
  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });

  const slot1 = game.clubSlots.find((s) => s.slotIndex === 1);
  const slot2 = game.clubSlots.find((s) => s.slotIndex === 2);
  const existingCodes = new Set(
    (await prisma.preSaleClubSlot.findMany({ where: { preSaleGameId: { not: id } }, select: { clubCode: true } })).map((s) => s.clubCode)
  );

  function newCode(): string {
    let c = generateClubCode();
    while (existingCodes.has(c)) {
      c = generateClubCode();
      existingCodes.add(c);
    }
    return c;
  }

  const codeA = slot1?.paymentStatus === 'PAID' ? slot1.clubCode : newCode();
  if (!existingCodes.has(codeA)) existingCodes.add(codeA);
  const codeB = slot2?.paymentStatus === 'PAID' ? slot2.clubCode : newCode();

  return prisma.$transaction(async (tx) => {
    if (!slot1) {
      await tx.preSaleClubSlot.create({
        data: {
          preSaleGameId: id,
          slotIndex: 1,
          clubCode: codeA,
          responsibleName: '',
          clubName: '',
          teamMemberCount: 0,
          contractVersion: 'v1.0',
          termsAcceptedAt: new Date(0),
        },
      });
    } else if (slot1.paymentStatus !== 'PAID') {
      await tx.preSaleClubSlot.update({
        where: { id: slot1.id },
        data: { clubCode: codeA },
      });
    }
    if (!slot2) {
      await tx.preSaleClubSlot.create({
        data: {
          preSaleGameId: id,
          slotIndex: 2,
          clubCode: codeB,
          responsibleName: '',
          clubName: '',
          teamMemberCount: 0,
          contractVersion: 'v1.0',
          termsAcceptedAt: new Date(0),
        },
      });
    } else if (slot2.paymentStatus !== 'PAID') {
      await tx.preSaleClubSlot.update({
        where: { id: slot2.id },
        data: { clubCode: codeB },
      });
    }

    const updated = await tx.preSaleGame.findUnique({
      where: { id },
      include: { clubSlots: { orderBy: { slotIndex: 'asc' } } },
    });
    return NextResponse.json(updated);
  });
}
