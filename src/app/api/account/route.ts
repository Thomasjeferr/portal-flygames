import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** GET /api/account – Dados completos para o dashboard da conta (user + favoriteTeam + subscription + purchases). */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const [user, subscription, purchases, teamManagerCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        favoriteTeamId: true,
        favoriteTeam: {
          select: { id: true, name: true, shortName: true, crestUrl: true, city: true, state: true, slug: true },
        },
      },
    }),
    prisma.subscription.findUnique({
      where: { userId: session.userId },
      include: { plan: { select: { id: true, name: true, periodicity: true, price: true } } },
    }),
    prisma.purchase.findMany({
      where: { userId: session.userId },
      orderBy: { purchasedAt: 'desc' },
      include: {
        plan: { select: { name: true, type: true, price: true, teamPayoutPercent: true } },
        game: { select: { id: true, title: true, slug: true } },
        team: { select: { id: true, name: true, crestUrl: true } },
      },
    }),
    prisma.teamManager.count({ where: { userId: session.userId } }),
  ]);

  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  const subscriptionActive =
    !!subscription?.active && subscription.endDate >= new Date();

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      favoriteTeamId: user.favoriteTeamId,
      favoriteTeam: user.favoriteTeam,
    },
    isTeamManager: teamManagerCount > 0,
    subscription: subscription
      ? {
          id: subscription.id,
          active: subscriptionActive,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          plan: subscription.plan,
          paymentGateway: subscription.paymentGateway,
        }
      : null,
    purchases,
  });
}
