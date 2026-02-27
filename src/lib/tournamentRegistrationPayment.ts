import { prisma } from '@/lib/db';

/**
 * Marca uma inscrição paga de torneio como confirmada (payment_status = paid, team_status = CONFIRMED).
 * Usado pelos webhooks Stripe e Woovi e pelo endpoint de sync.
 */
export async function markTournamentRegistrationAsPaid(
  tournamentId: string,
  teamId: string,
  stripeSubscriptionId?: string | null
): Promise<boolean> {
  const tt = await prisma.tournamentTeam.findUnique({
    where: { tournamentId_teamId: { tournamentId, teamId } },
  });
  if (!tt || tt.paymentStatus === 'paid') return false;

  await prisma.tournamentTeam.update({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    data: {
      paymentStatus: 'paid',
      teamStatus: 'CONFIRMED',
      ...(stripeSubscriptionId != null && { registrationStripeSubscriptionId: stripeSubscriptionId }),
    },
  });
  return true;
}

/**
 * Marca por id do TournamentTeam (útil quando o correlationId do Woovi é o id do registro).
 */
export async function markTournamentRegistrationAsPaidById(tournamentTeamId: string): Promise<boolean> {
  const tt = await prisma.tournamentTeam.findUnique({
    where: { id: tournamentTeamId },
  });
  if (!tt || tt.paymentStatus === 'paid') return false;

  await prisma.tournamentTeam.update({
    where: { id: tournamentTeamId },
    data: { paymentStatus: 'paid', teamStatus: 'CONFIRMED' },
  });
  return true;
}
