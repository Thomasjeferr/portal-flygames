import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const purchases = await prisma.purchase.findMany({
    where: { userId: session.userId },
    orderBy: { purchasedAt: 'desc' },
    include: {
      plan: { select: { name: true, type: true, price: true } },
      game: { select: { id: true, title: true, slug: true } },
    },
  });

  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.userId },
    include: { plan: { select: { name: true, periodicity: true, price: true } } },
  });

  const subscriptionActive =
    !!subscription?.active &&
    subscription.endDate >= new Date();

  return NextResponse.json({
    purchases,
    subscription: subscription
      ? {
          ...subscription,
          active: subscriptionActive,
        }
      : null,
  });
}
