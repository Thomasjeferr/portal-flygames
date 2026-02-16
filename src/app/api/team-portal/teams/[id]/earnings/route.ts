import { NextRequest, NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';

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

  let sponsorEarnings = [] as Awaited<
    ReturnType<typeof prisma.teamSponsorshipEarning.findMany>
  >;
  let planEarnings = [] as Awaited<
    ReturnType<typeof prisma.teamPlanEarning.findMany>
  >;

  try {
    [sponsorEarnings, planEarnings] = await Promise.all([
      prisma.teamSponsorshipEarning.findMany({
        where: { teamId },
        include: {
          sponsorOrder: {
            select: { companyName: true, email: true, createdAt: true, amountCents: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.teamPlanEarning.findMany({
        where: { teamId },
        include: {
          purchase: {
            select: { createdAt: true, amountToTeamCents: true },
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

  const sponsorItems = sponsorEarnings.map((e) => ({
    id: e.id,
    source: 'sponsor' as const,
    amountCents: e.amountCents,
    status: e.status,
    paidAt: e.paidAt,
    paymentReference: e.paymentReference,
    createdAt: e.createdAt,
    description: e.sponsorOrder?.companyName ?? 'Patrocínio',
    subDescription: e.sponsorOrder?.email ?? '',
    orderCreatedAt: e.sponsorOrder?.createdAt ?? e.createdAt,
  }));

  const planItems = planEarnings.map((e) => ({
    id: e.id,
    source: 'plan' as const,
    amountCents: e.amountCents,
    status: e.status,
    paidAt: e.paidAt,
    paymentReference: e.paymentReference,
    createdAt: e.createdAt,
    description: e.purchase?.plan?.name ?? 'Plano/Jogo',
    subDescription: e.purchase?.user?.email ?? e.purchase?.user?.name ?? '',
    orderCreatedAt: e.purchase?.createdAt ?? e.createdAt,
  }));

  const earnings = [...sponsorItems, ...planItems].sort(
    (a, b) => new Date(b.orderCreatedAt).getTime() - new Date(a.orderCreatedAt).getTime()
  );

  const pendingCents = earnings
    .filter((e) => e.status === 'pending')
    .reduce((s, e) => s + e.amountCents, 0);
  const paidCents = earnings
    .filter((e) => e.status === 'paid')
    .reduce((s, e) => s + e.amountCents, 0);

  return NextResponse.json({
    team: {
      id: team.id,
      name: team.name,
      payoutPixKey: team.payoutPixKey,
      payoutName: team.payoutName,
    },
    summary: { pendingCents, paidCents },
    earnings,
  });
}

