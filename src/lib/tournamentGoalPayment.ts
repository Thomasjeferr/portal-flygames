import { prisma } from '@/lib/db';

/**
 * Processa pagamento de assinatura "Apoiar time" (GOAL).
 * Cria ou atualiza TournamentSubscription e recalcula goal_current_supporters.
 * Se atingir a meta, marca team_status CONFIRMED e goal_status ACHIEVED (respeitando lock_confirmation_on_goal).
 */
export async function processTournamentGoalSubscriptionPaid(
  userId: string,
  tournamentId: string,
  teamId: string,
  subscriptionId: string
): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament || tournament.registrationMode !== 'GOAL') return;

  const tt = await prisma.tournamentTeam.findUnique({
    where: { tournamentId_teamId: { tournamentId, teamId } },
  });
  if (!tt || tt.registrationType !== 'GOAL') return;

  const now = new Date();

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
  } else {
    await prisma.tournamentSubscription.create({
      data: {
        userId,
        tournamentId,
        teamSupportedId: teamId,
        stripeSubscriptionId: subscriptionId,
        startedAt: now,
        status: 'ACTIVE',
      },
    });
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
