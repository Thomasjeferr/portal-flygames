import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cancelStripeSubscriptionAtPeriodEnd } from '@/lib/payments/stripe';

/**
 * Solicita ou executa cancelamento do patrocínio.
 * - sponsor_fan: agenda cancelamento no Stripe (fim do período).
 * - sponsor_company em fidelidade: apenas registra solicitação (status cancellation_requested).
 * - sponsor_company fora da fidelidade: agenda cancelamento no Stripe.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Faça login para continuar' }, { status: 401 });
  }

  let body: { sponsorId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }

  const sponsorId = body.sponsorId;
  if (!sponsorId) {
    return NextResponse.json({ error: 'sponsorId é obrigatório' }, { status: 400 });
  }

  const sponsor = await prisma.sponsor.findUnique({
    where: { id: sponsorId },
    include: {
      sponsorOrder: { select: { userId: true, email: true } },
    },
  });

  if (!sponsor?.sponsorOrder) {
    return NextResponse.json({ error: 'Patrocínio não encontrado' }, { status: 404 });
  }

  if (sponsor.sponsorOrder.userId !== session.userId) {
    return NextResponse.json({ error: 'Este patrocínio não pertence à sua conta' }, { status: 403 });
  }

  if (!sponsor.isActive) {
    return NextResponse.json({ error: 'Este patrocínio já está inativo' }, { status: 400 });
  }

  if (sponsor.cancellationRequestedAt) {
    return NextResponse.json({
      message: 'Cancelamento já foi solicitado. O acesso será mantido até o fim do período atual.',
      alreadyRequested: true,
    });
  }

  const now = new Date();
  const inLoyalty =
    sponsor.hasLoyalty &&
    sponsor.loyaltyEndDate &&
    new Date(sponsor.loyaltyEndDate) > now;

  if (sponsor.planType === 'sponsor_fan') {
    if (!sponsor.externalSubscriptionId) {
      return NextResponse.json(
        { error: 'Não foi possível cancelar este patrocínio automaticamente. Entre em contato com o suporte.' },
        { status: 400 }
      );
    }
    const ok = await cancelStripeSubscriptionAtPeriodEnd(sponsor.externalSubscriptionId);
    if (!ok) {
      return NextResponse.json(
        { error: 'Não foi possível agendar o cancelamento. Tente novamente ou entre em contato com o suporte.' },
        { status: 503 }
      );
    }
    return NextResponse.json({
      message: 'Renovação cancelada. Você mantém acesso até o fim do período atual.',
      endAt: sponsor.endAt?.toISOString?.() ?? null,
    });
  }

  if (sponsor.planType === 'sponsor_company' && inLoyalty) {
    await prisma.sponsor.update({
      where: { id: sponsor.id },
      data: {
        cancellationRequestedAt: now,
        contractStatus: 'cancellation_requested',
      },
    });
    const endFormatted = sponsor.loyaltyEndDate
      ? new Date(sponsor.loyaltyEndDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : '';
    return NextResponse.json({
      message: `Este plano possui fidelidade vigente até ${endFormatted}. Sua solicitação de cancelamento foi registrada. Para cancelamento antecipado, contate o suporte/administrador.`,
      cancellationRequested: true,
      loyaltyEndDate: sponsor.loyaltyEndDate?.toISOString?.() ?? null,
    });
  }

  if (sponsor.externalSubscriptionId) {
    const ok = await cancelStripeSubscriptionAtPeriodEnd(sponsor.externalSubscriptionId);
    if (!ok) {
      return NextResponse.json(
        { error: 'Não foi possível agendar o cancelamento. Tente novamente ou entre em contato com o suporte.' },
        { status: 503 }
      );
    }
  }

  return NextResponse.json({
    message: 'Renovação cancelada. Você mantém acesso até o fim do período atual.',
    endAt: sponsor.endAt?.toISOString?.() ?? null,
  });
}
