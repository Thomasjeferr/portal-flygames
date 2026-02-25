import { NextRequest, NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';
import { getAvailableAt } from '@/lib/payoutRules';

/** Cria um pedido de saque para o time (planos + patrocínios liberados). */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;

  if (!(await getTeamAccess(teamId))) {
    return NextResponse.json({ error: 'Acesso negado a este time' }, { status: 403 });
  }

  const [sponsorEarnings, planEarnings] = await Promise.all([
    prisma.teamSponsorshipEarning.findMany({
      where: { teamId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
      include: {
        sponsorOrder: {
          select: { createdAt: true, paymentGateway: true },
        },
        withdrawalSponsorshipItems: {
          include: { withdrawal: { select: { status: true } } },
        },
      },
    }),
    prisma.teamPlanEarning.findMany({
      where: { teamId, status: 'pending' },
      orderBy: { createdAt: 'asc' },
      include: {
        purchase: {
          select: { createdAt: true, paymentGateway: true },
        },
        withdrawalPlanItems: {
          include: { withdrawal: { select: { status: true } } },
        },
      },
    }),
  ]);

  const now = new Date();

  const availableSponsorEarnings = sponsorEarnings.filter((e) => {
    const hasActiveWithdrawal = e.withdrawalSponsorshipItems.some(
      (item) => item.withdrawal.status !== 'canceled'
    );
    if (hasActiveWithdrawal) return false;
    const createdAt = e.sponsorOrder?.createdAt ?? e.createdAt;
    const gateway = e.sponsorOrder?.paymentGateway ?? null;
    const availableAt = getAvailableAt(createdAt, gateway);
    return availableAt <= now;
  });

  const availablePlanEarnings = planEarnings.filter((e) => {
    const hasActiveWithdrawal = e.withdrawalPlanItems.some(
      (item) => item.withdrawal.status !== 'canceled'
    );
    if (hasActiveWithdrawal) return false;
    const createdAt = e.purchase?.createdAt ?? e.createdAt;
    const gateway = e.purchase?.paymentGateway ?? null;
    const availableAt = getAvailableAt(createdAt, gateway);
    return availableAt <= now;
  });

  const totalCents =
    availableSponsorEarnings.reduce((sum, e) => sum + e.amountCents, 0) +
    availablePlanEarnings.reduce((sum, e) => sum + e.amountCents, 0);

  if (totalCents <= 0) {
    return NextResponse.json(
      {
        error:
          'Você ainda não tem valores liberados para saque. Vendas em cartão liberam após o prazo de compensação.',
      },
      { status: 400 }
    );
  }

  const withdrawal = await prisma.teamWithdrawal.create({
    data: {
      teamId,
      amountCents: totalCents,
      status: 'requested',
      requestedAt: now,
      planItems: {
        create: availablePlanEarnings.map((e) => ({
          earningId: e.id,
          amountCents: e.amountCents,
        })),
      },
      sponsorshipItems: {
        create: availableSponsorEarnings.map((e) => ({
          earningId: e.id,
          amountCents: e.amountCents,
        })),
      },
    },
    include: {
      planItems: true,
      sponsorshipItems: true,
    },
  });

  return NextResponse.json({
    ok: true,
    withdrawalId: withdrawal.id,
    amountCents: withdrawal.amountCents,
    itemsCount: withdrawal.planItems.length + withdrawal.sponsorshipItems.length,
  });
}

