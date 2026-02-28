import { prisma } from '@/lib/db';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Retorna um plano ativo com acesso total ao portal (para apoiadores de meta).
 * Usado para garantir que o apoiador tenha Subscription que dá hasFullAccess().
 */
async function getPortalAccessPlanId(): Promise<string | null> {
  const plan = await prisma.plan.findFirst({
    where: { active: true, acessoTotal: true },
    select: { id: true },
  });
  return plan?.id ?? null;
}

/**
 * Garante que o usuário (apoiador de time na meta) tenha Subscription (plano) ativa
 * com acesso total ao portal. Chamado no webhook invoice.paid para tournament-goal.
 * Renovações: estende endDate em 1 mês para manter acesso enquanto o Stripe cobrar.
 * Assim, mesmo que o campeonato seja excluído depois, o apoiador mantém acesso.
 */
export async function ensurePortalSubscriptionForGoalSupporter(
  userId: string,
  stripeSubscriptionId: string
): Promise<void> {
  const planId = await getPortalAccessPlanId();
  if (!planId) {
    console.warn('[tournamentGoal] Nenhum plano com acesso total encontrado; apoiador não ganha assinatura do portal.');
    return;
  }

  const now = new Date();
  const endDateNew = addMonths(now, 1);

  const existing = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!existing) {
    await prisma.subscription.create({
      data: {
        userId,
        planId,
        active: true,
        startDate: now,
        endDate: endDateNew,
        paymentGateway: 'stripe',
        externalSubscriptionId: stripeSubscriptionId,
      },
    });
    return;
  }

  const endDateExtended = existing.endDate > endDateNew ? existing.endDate : endDateNew;
  if (existing.active && existing.endDate >= now) {
    // Já tem assinatura ativa (ex.: outro plano): só estende endDate, não vincula ao Stripe do goal
    await prisma.subscription.update({
      where: { userId },
      data: { endDate: endDateExtended },
    });
    return;
  }
  // Sem assinatura ativa: ativa com plano de acesso total e vincula ao Stripe do goal
  await prisma.subscription.update({
    where: { userId },
    data: {
      active: true,
      endDate: endDateExtended,
      planId: existing.planId ?? planId,
      paymentGateway: 'stripe',
      externalSubscriptionId: stripeSubscriptionId,
    },
  });
}

/**
 * Desativa a Subscription (plano portal) do usuário quando a assinatura Stripe de apoio
 * é cancelada. Chamado no webhook customer.subscription.deleted para tournament-goal.
 */
export async function deactivatePortalSubscriptionByStripeId(
  stripeSubscriptionId: string
): Promise<void> {
  const sub = await prisma.subscription.findFirst({
    where: { externalSubscriptionId: stripeSubscriptionId },
  });
  if (!sub) return;
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { active: false, endDate: new Date() },
  });
}

/**
 * Processa pagamento de assinatura "Apoiar time" (GOAL).
 * Cria ou atualiza TournamentSubscription, atualiza favoriteTeamId, cria TeamTournamentGoalEarning se goalPayoutPercent > 0,
 * e recalcula goal_current_supporters.
 */
export async function processTournamentGoalSubscriptionPaid(
  userId: string,
  tournamentId: string,
  teamId: string,
  subscriptionId: string,
  amountCents?: number
): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament || tournament.registrationMode !== 'GOAL') return;

  const tt = await prisma.tournamentTeam.findUnique({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    select: { goalPayoutPercent: true, registrationType: true },
  });
  if (!tt || tt.registrationType !== 'GOAL') return;

  const now = new Date();

  let tournamentSubscriptionId: string;
  const existing = await prisma.tournamentSubscription.findFirst({
    where: { userId, tournamentId, teamSupportedId: teamId },
  });
  if (existing) {
    await prisma.tournamentSubscription.update({
      where: { id: existing.id },
      data: {
        stripeSubscriptionId: subscriptionId,
        status: 'ACTIVE',
        endedAt: null,
      },
    });
    tournamentSubscriptionId = existing.id;
  } else {
    const created = await prisma.tournamentSubscription.create({
      data: {
        userId,
        tournamentId,
        teamSupportedId: teamId,
        stripeSubscriptionId: subscriptionId,
        startedAt: now,
        status: 'ACTIVE',
      },
    });
    tournamentSubscriptionId = created.id;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { favoriteTeamId: teamId },
  });

  const percent = tt.goalPayoutPercent ?? 0;
  if (percent > 0 && typeof amountCents === 'number' && amountCents > 0) {
    const amountToTeamCents = Math.round((amountCents * percent) / 100);
    if (amountToTeamCents > 0) {
      await prisma.teamTournamentGoalEarning.create({
        data: {
          teamId,
          tournamentSubscriptionId,
          amountCents: amountToTeamCents,
          status: 'pending',
        },
      });
    }
  }

  await recalculateGoalSupportersAndConfirm(tournamentId, teamId);
}

/**
 * Conta assinaturas ativas no período da meta (goal_start_at .. goal_end_at) e atualiza
 * goal_current_supporters. Se atingir meta e time está IN_GOAL, marca CONFIRMED + ACHIEVED.
 */
export async function recalculateGoalSupportersAndConfirm(
  tournamentId: string,
  teamId: string
): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament || tournament.registrationMode !== 'GOAL') return;
  const goalStart = tournament.goalStartAt;
  const goalEnd = tournament.goalEndAt;
  const required = tournament.goalRequiredSupporters ?? 0;

  const tt = await prisma.tournamentTeam.findUnique({
    where: { tournamentId_teamId: { tournamentId, teamId } },
  });
  if (!tt) return;

  // Apenas assinaturas ativas criadas no período da meta (startedAt entre goalStart e goalEnd)
  const count = await prisma.tournamentSubscription.count({
    where: {
      tournamentId,
      teamSupportedId: teamId,
      status: 'ACTIVE',
      ...(goalStart && goalEnd
        ? {
            startedAt: {
              gte: goalStart,
              lte: goalEnd,
            },
          }
        : {}),
    },
  });

  const updates: {
    goalCurrentSupporters: number;
    teamStatus?: string;
    goalStatus?: string;
    goalAchievedAt?: Date | null;
  } = { goalCurrentSupporters: count };

  const alreadyConfirmed = tt.teamStatus === 'CONFIRMED' && tt.goalStatus === 'ACHIEVED';
  const lockConfirmation = tournament.lockConfirmationOnGoal;

  if (
    !alreadyConfirmed &&
    count >= required &&
    (tt.teamStatus === 'IN_GOAL' || tt.teamStatus === 'APPLIED')
  ) {
    updates.teamStatus = 'CONFIRMED';
    updates.goalStatus = 'ACHIEVED';
    updates.goalAchievedAt = new Date();
  } else if (!lockConfirmation && count < required && tt.teamStatus === 'CONFIRMED' && tt.goalStatus === 'ACHIEVED') {
    updates.teamStatus = 'IN_GOAL';
    updates.goalStatus = 'PENDING';
    updates.goalAchievedAt = null;
  }

  await prisma.tournamentTeam.update({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    data: updates,
  });
}
