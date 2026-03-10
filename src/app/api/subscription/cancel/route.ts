import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cancelStripeSubscriptionAtPeriodEnd } from '@/lib/payments/stripe';

/**
 * Agenda o cancelamento da assinatura no fim do período.
 * O usuário mantém acesso até a data de renovação; depois disso não será mais cobrado.
 */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Faça login para continuar' }, { status: 401 });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.userId },
    select: { id: true, externalSubscriptionId: true, active: true, endDate: true },
  });

  if (!subscription?.externalSubscriptionId || !subscription.active) {
    return NextResponse.json(
      { error: 'Você não tem uma assinatura ativa no cartão para cancelar.' },
      { status: 403 }
    );
  }

  const ok = await cancelStripeSubscriptionAtPeriodEnd(subscription.externalSubscriptionId);
  if (!ok) {
    return NextResponse.json(
      { error: 'Não foi possível agendar o cancelamento. Tente novamente ou entre em contato com o suporte.' },
      { status: 503 }
    );
  }

  return NextResponse.json({
    message: 'A renovação foi cancelada. Você mantém acesso até o fim do período atual.',
    endDate: subscription.endDate?.toISOString?.() ?? null,
  });
}
