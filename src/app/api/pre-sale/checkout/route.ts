import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isTeamOwner } from '@/lib/access';
import { clubCheckoutSchema } from '@/lib/pre-sale/validations';
import { CONTRACT_VERSION } from '@/lib/pre-sale/enums';
import { createWooviCharge } from '@/lib/payments/woovi';

const NOT_OWNER_MESSAGE =
  'Para comprar o slot da pré-estreia, é necessário usar a conta de responsável pelo time (mandante ou visitante deste jogo). A conta com a qual você está logado não é responsável por nenhum dos times desta pré-estreia.';
const NOT_OWNER_INSTRUCTION =
  'Faça logout e entre com o e-mail que você usa para acessar a Área do time no portal (painel do clube). Se você ainda não cadastrou o time, cadastre primeiro e aguarde a aprovação. Se o responsável for outra pessoa, ela deve fazer login com a conta dela para efetuar o pagamento.';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'Faça login com a conta de responsável do time para comprar.' }, { status: 401 });
    }

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
      include: { preSaleGame: { select: { id: true, title: true, homeTeamId: true, awayTeamId: true, maxSimultaneousPerClub: true, clubAPrice: true, clubBPrice: true } } },
    });

    if (!slot) return NextResponse.json({ error: 'Código do clube inválido' }, { status: 400 });
    if (slot.paymentStatus === 'PAID') return NextResponse.json({ error: 'Este slot já foi pago' }, { status: 400 });

    const teamIdForSlot = slot.slotIndex === 1 ? slot.preSaleGame.homeTeamId : slot.preSaleGame.awayTeamId;
    if (!teamIdForSlot) {
      return NextResponse.json(
        {
          error:
            'Este jogo precisa ter time mandante e visitante definidos para compra. Entre em contato com o administrador.',
        },
        { status: 400 }
      );
    }

    const isOwner = await isTeamOwner(session.userId, teamIdForSlot);
    if (!isOwner) {
      return NextResponse.json(
        { error: NOT_OWNER_MESSAGE, message: NOT_OWNER_MESSAGE, instruction: NOT_OWNER_INSTRUCTION },
        { status: 403 }
      );
    }

    const maxMembers = slot.preSaleGame.maxSimultaneousPerClub ?? 999;
    if (teamMemberCount > maxMembers) {
      return NextResponse.json(
        { error: `A quantidade de membros não pode ser maior que ${maxMembers} (limite de telas deste jogo).` },
        { status: 400 }
      );
    }

    const price = slot.slotIndex === 1 ? slot.preSaleGame.clubAPrice : slot.preSaleGame.clubBPrice;
    const amountCents = Math.round(price * 100);
    const externalId = `presale-${slot.id}`;
    const charge = await createWooviCharge({
      amount: amountCents,
      customer: responsibleEmail.trim(),
      customerName: responsibleName?.trim(),
      description: `Pre-estreia: ${slot.preSaleGame.title} - Clube ${slot.slotIndex}`,
      externalId,
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
          teamId: teamIdForSlot,
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
