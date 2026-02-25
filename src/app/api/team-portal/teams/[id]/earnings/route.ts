import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';
import { getAvailableAt } from '@/lib/payoutRules';

type SponsorEarningWithOrder = Prisma.TeamSponsorshipEarningGetPayload<{
  include: {
    sponsorOrder: {
      select: { companyName: true; email: true; createdAt: true; amountCents: true; paymentGateway: true };
    };
  };
}>;
type PlanEarningWithPurchase = Prisma.TeamPlanEarningGetPayload<{
  include: {
    purchase: {
      select: { createdAt: true; amountToTeamCents: true; paymentGateway: true };
      include: { user: { select: { name: true; email: true } }; plan: { select: { name: true } } };
    };
  };
}>;

/** Comissões do time (patrocínio + planos/jogos) para painel do time (somente leitura). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  if (!(await getTeamAccess(teamId))) {
    return NextResponse.json({ error: 'Acesso negado a este time' }, { status: 403 });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, payoutPixKey: true, payoutName: true },
  });
  if (!team) return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });

  let sponsorEarnings: SponsorEarningWithOrder[] = [];
  let planEarnings: PlanEarningWithPurchase[] = [];

  try {
    [sponsorEarnings, planEarnings] = await Promise.all([
      prisma.teamSponsorshipEarning.findMany({
        where: { teamId },
        include: {
          sponsorOrder: {
            select: { companyName: true, email: true, createdAt: true, amountCents: true, paymentGateway: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.teamPlanEarning.findMany({
        where: { teamId },
        include: {
          purchase: {
            select: { createdAt: true, amountToTeamCents: true, paymentGateway: true },
            include: {
              user: { select: { name: true, email: true } },
              plan: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
  } catch (e) {
    console.error('[GET /api/team-portal/teams/[id]/earnings] query', e);
  }

  const sponsorItems = (sponsorEarnings as SponsorEarningWithOrder[]).map((e) => {
    const orderCreatedAt = e.sponsorOrder?.createdAt ?? e.createdAt;
    const gateway = e.sponsorOrder?.paymentGateway ?? null;
    const availableAt = getAvailableAt(orderCreatedAt, gateway);
    return {
      id: e.id,
      source: 'sponsor' as const,
      amountCents: e.amountCents,
      status: e.status,
      paidAt: e.paidAt,
      paymentReference: e.paymentReference,
      createdAt: e.createdAt,
      description: e.sponsorOrder?.companyName ?? 'Patrocínio',
      subDescription: e.sponsorOrder?.email ?? '',
      orderCreatedAt,
      availableAt,
    };
  });

  const planItems = (planEarnings as PlanEarningWithPurchase[]).map((e) => {
    const orderCreatedAt = e.purchase?.createdAt ?? e.createdAt;
    const gateway = e.purchase?.paymentGateway ?? null;
    const availableAt = getAvailableAt(orderCreatedAt, gateway);
    return {
      id: e.id,
      source: 'plan' as const,
      amountCents: e.amountCents,
      status: e.status,
      paidAt: e.paidAt,
      paymentReference: e.paymentReference,
      createdAt: e.createdAt,
      description: e.purchase?.plan?.name ?? 'Plano/Jogo',
      subDescription: e.purchase?.user?.email ?? e.purchase?.user?.name ?? '',
      orderCreatedAt,
      availableAt,
    };
  });

  const earnings = [...sponsorItems, ...planItems].sort(
    (a, b) => new Date(b.orderCreatedAt).getTime() - new Date(a.orderCreatedAt).getTime()
  );

  const now = new Date();
  let pendingCents = 0;
  let availableCents = 0;
  let paidCents = 0;
  for (const e of earnings) {
    if (e.status === 'paid') {
      paidCents += e.amountCents;
    } else {
      pendingCents += e.amountCents;
      if (e.availableAt <= now) {
        availableCents += e.amountCents;
      }
    }
  }

  return NextResponse.json({
    team: {
      id: team.id,
      name: team.name,
      payoutPixKey: team.payoutPixKey,
      payoutName: team.payoutName,
    },
    summary: { pendingCents, availableCents, paidCents },
    earnings,
  });
}

