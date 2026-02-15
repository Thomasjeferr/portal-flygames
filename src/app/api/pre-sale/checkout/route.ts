import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { clubCheckoutSchema } from '@/lib/pre-sale/validations';
import { CONTRACT_VERSION } from '@/lib/pre-sale/enums';
import { createWooviCharge } from '@/lib/payments/woovi';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = clubCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }
    const { responsibleName, responsibleEmail, clubName, clubCode, teamMemberCount } = parsed.data;

    const slot = await prisma.preSaleClubSlot.findUnique({
      where: { clubCode },
      include: { preSaleGame: true },
    });

    if (!slot) return NextResponse.json({ error: 'Código do clube inválido' }, { status: 400 });
    if (slot.paymentStatus === 'PAID') return NextResponse.json({ error: 'Este slot já foi pago' }, { status: 400 });

    const price = slot.slotIndex === 1 ? slot.preSaleGame.clubAPrice : slot.preSaleGame.clubBPrice;
    const amountCents = Math.round(price * 100);
    const externalId = `presale-${slot.id}`;
    const charge = await createWooviCharge({
      amount: amountCents,
      customer: 'club@presale.com',
      description: `Pre-estreia: ${slot.preSaleGame.title} - Clube ${slot.slotIndex}`,
      externalId,
      expiresIn: 3600,
    });

    if (!charge?.qrCode && !charge?.qrCodeImage) {
      return NextResponse.json({ error: 'Não foi possível gerar pagamento Pix' }, { status: 500 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.preSaleClubSlot.update({
        where: { id: slot.id },
        data: {
          responsibleName,
          responsibleEmail: responsibleEmail.trim(),
          clubName,
          teamMemberCount,
          contractVersion: CONTRACT_VERSION,
          termsAcceptedAt: new Date(),
          paymentReference: charge.id,
        },
      });
    });

    return NextResponse.json({
      method: 'pix',
      qrCode: charge.qrCode,
      qrCodeImage: charge.qrCodeImage,
      expiresAt: charge.expiresAt,
      amount: price,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao processar checkout' }, { status: 500 });
  }
}
