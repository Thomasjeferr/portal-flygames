import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasActiveRecurringAccess, getAccountTypes } from '@/lib/access';

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
        avatarUrl: true,
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

  // Mesmo critério de hasActiveSponsor: pedidos por userId OU pelo e-mail da conta (patrocínio torcedor pode ter sido comprado com e-mail)
  const emailNorm = user.email?.trim().toLowerCase() || '';
  const sponsorOrders = await prisma.sponsorOrder.findMany({
    where: {
      paymentStatus: 'paid',
      OR: [
        { userId: session.userId },
        ...(emailNorm ? [{ email: { equals: emailNorm, mode: 'insensitive' as const } }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    include: {
      sponsorPlan: { select: { id: true, name: true, price: true, billingPeriod: true, type: true } },
      sponsor: true,
      team: { select: { id: true, name: true, crestUrl: true } },
    },
  });

  const subscriptionActive =
    !!subscription?.active && subscription.endDate >= new Date();

  // Backfill em leitura: se a assinatura tem amountCents null, usar o valor da última compra paga desse plano (valor realmente pago), não o preço atual do plano.
  let subscriptionPayload: typeof subscription = subscription;
  try {
    if (subscription?.planId && subscription.amountCents == null) {
      const lastPaidPurchase = await prisma.purchase.findFirst({
        where: { userId: session.userId, planId: subscription.planId, paymentStatus: 'paid' },
        orderBy: { purchasedAt: 'desc' },
        select: { amountCents: true },
      });
      const amountCents = lastPaidPurchase?.amountCents ?? null;
      if (amountCents != null) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { amountCents },
        });
        subscriptionPayload = { ...subscription, amountCents };
      }
    }
  } catch (_) {
    // Coluna pode não existir ou outro erro; seguir sem backfill
  }

  const hasRecurringAccess = await hasActiveRecurringAccess(session.userId, user.email);

  const { accountType, accountTypeLabels } = await getAccountTypes(session.userId, user.email);

  // Não fazemos backfill de amountCents nas compras com plan.price: o valor exibido deve ser o pago, não o preço atual do plano.
  const purchasesPayload = purchases;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      favoriteTeamId: user.favoriteTeamId,
      avatarUrl: user.avatarUrl,
      favoriteTeam: user.favoriteTeam,
    },
    isTeamManager: teamManagerCount > 0,
    subscription: subscriptionPayload
      ? {
          id: subscriptionPayload.id,
          active: subscriptionActive,
          planId: subscriptionPayload.planId,
          startDate: subscriptionPayload.startDate,
          endDate: subscriptionPayload.endDate,
          amountCents: subscriptionPayload.amountCents,
          plan: subscriptionPayload.plan,
          paymentGateway: subscriptionPayload.paymentGateway,
          cancellationRequestedAt: subscriptionPayload.cancellationRequestedAt?.toISOString?.() ?? null,
        }
      : null,
    hasActiveRecurringAccess: hasRecurringAccess,
    accountType,
    accountTypeLabels,
    purchases: purchasesPayload,
    sponsorOrders: sponsorOrders.map((o) => ({
      id: o.id,
      companyName: o.companyName,
      email: o.email,
      amountCents: o.amountCents,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
      contractAcceptedAt: o.contractAcceptedAt,
      contractSnapshot: o.contractSnapshot,
      sponsorPlan: o.sponsorPlan,
      sponsor: o.sponsor
        ? {
            id: o.sponsor.id,
            isActive: o.sponsor.isActive,
            startAt: o.sponsor.startAt,
            endAt: o.sponsor.endAt,
            planType: o.sponsor.planType,
            hasLoyalty: o.sponsor.hasLoyalty,
            loyaltyMonths: o.sponsor.loyaltyMonths,
            loyaltyStartDate: o.sponsor.loyaltyStartDate,
            loyaltyEndDate: o.sponsor.loyaltyEndDate,
            contractStatus: o.sponsor.contractStatus,
            cancellationRequestedAt: o.sponsor.cancellationRequestedAt,
          }
        : null,
      team: o.team,
    })),
  });
}
