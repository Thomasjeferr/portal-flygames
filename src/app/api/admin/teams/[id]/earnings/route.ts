import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

type SponsorEarningWithOrder = Prisma.TeamSponsorshipEarningGetPayload<{
  include: { sponsorOrder: { select: { companyName: true; email: true; createdAt: true; amountCents: true } } };
}>;
type PlanEarningWithPurchase = Prisma.TeamPlanEarningGetPayload<{
  include: { purchase: { select: { createdAt: true; amountToTeamCents: true }; include: { user: { select: { name: true; email: true } }; plan: { select: { name: true } } } } };
}>;

/** Lista comissões do time (patrocínio + planos/jogos) (admin). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin')
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const id = (await params).id;
    const team = await prisma.team.findUnique({
      where: { id },
      select: { id: true, name: true, payoutPixKey: true, payoutName: true },
    });
    if (!team) return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });

    let sponsorEarnings: SponsorEarningWithOrder[] = [];
    let planEarnings: PlanEarningWithPurchase[] = [];
    try {
      const [sponsorResult, planResult] = await Promise.all([
        prisma.teamSponsorshipEarning.findMany({
          where: { teamId: id },
          include: {
            sponsorOrder: { select: { companyName: true, email: true, createdAt: true, amountCents: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.teamPlanEarning.findMany({
          where: { teamId: id },
          include: {
            purchase: {
              select: { createdAt: true, amountToTeamCents: true },
              include: { user: { select: { name: true, email: true } }, plan: { select: { name: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      sponsorEarnings = sponsorResult;
      planEarnings = planResult;
    } catch (queryErr) {
      console.error('[GET /api/admin/teams/[id]/earnings] query', queryErr);
      // Se as tabelas não existirem (ex.: db push não foi rodado), retorna listas vazias
    }

    const sponsorItems = sponsorEarnings.map((e) => ({
      id: e.id,
      source: 'sponsor' as const,
      amountCents: e.amountCents,
      status: e.status,
      paidAt: e.paidAt,
      paymentReference: e.paymentReference,
      createdAt: e.createdAt,
      description: e.sponsorOrder?.companyName ?? 'Patrocinador',
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
      description: e.purchase?.plan?.name ?? 'Plano',
      subDescription: e.purchase?.user?.email ?? e.purchase?.user?.name ?? '',
      orderCreatedAt: e.purchase?.createdAt ?? e.createdAt,
    }));

    const earnings = [...sponsorItems, ...planItems].sort(
      (a, b) => new Date(b.orderCreatedAt).getTime() - new Date(a.orderCreatedAt).getTime()
    );

    const pendingCents = earnings.filter((e) => e.status === 'pending').reduce((s, e) => s + e.amountCents, 0);
    const paidCents = earnings.filter((e) => e.status === 'paid').reduce((s, e) => s + e.amountCents, 0);

    return NextResponse.json({
      team: { id: team.id, name: team.name, payoutPixKey: team.payoutPixKey, payoutName: team.payoutName },
      summary: { pendingCents, paidCents },
      earnings,
    });
  } catch (err) {
    console.error('[GET /api/admin/teams/[id]/earnings]', err);
    return NextResponse.json(
      { error: 'Erro ao carregar comissões. Verifique o terminal do servidor.' },
      { status: 500 }
    );
  }
}
