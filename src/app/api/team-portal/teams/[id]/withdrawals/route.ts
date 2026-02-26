import { NextRequest, NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';
import { getAvailableAt } from '@/lib/payoutRules';

/** Lista saques do time (para painel do time). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;

  if (!(await getTeamAccess(teamId))) {
    return NextResponse.json({ error: 'Acesso negado a este time' }, { status: 403 });
  }

  const withdrawals = await prisma.teamWithdrawal.findMany({
    where: { teamId },
    orderBy: { requestedAt: 'desc' },
  });

  return NextResponse.json(
    withdrawals.map((w) => ({
      id: w.id,
      amountCents: w.amountCents,
      status: w.status,
      requestedAt: w.requestedAt.toISOString(),
      paidAt: w.paidAt?.toISOString() ?? null,
      paymentReference: w.paymentReference,
      receiptUrl: w.receiptUrl,
    }))
  );
}

/** Cria um pedido de saque para o time (planos + patrocínios liberados). Aceita body opcional: { pixKey?, pixKeyType?, pixName? }. Se não enviado, usa PIX do cadastro do time. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;

  if (!(await getTeamAccess(teamId))) {
    return NextResponse.json({ error: 'Acesso negado a este time' }, { status: 403 });
  }

  let bodyPix: { pixKey?: string; pixKeyType?: string; pixName?: string } = {};
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body === 'object') {
      if (typeof body.pixKey === 'string') bodyPix.pixKey = body.pixKey.trim() || undefined;
      if (typeof body.pixKeyType === 'string') bodyPix.pixKeyType = body.pixKeyType.trim() || undefined;
      if (typeof body.pixName === 'string') bodyPix.pixName = body.pixName.trim() || undefined;
    }
  } catch {
    // body opcional
  }

  const [sponsorEarnings, planEarnings, team] = await Promise.all([
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
    prisma.team.findUnique({
      where: { id: teamId },
      select: { payoutPixKey: true, payoutName: true },
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

  const pixKey = bodyPix.pixKey ?? team?.payoutPixKey ?? null;
  const pixKeyType = bodyPix.pixKeyType ?? (team?.payoutPixKey ? 'aleatoria' : null);
  const pixName = bodyPix.pixName ?? team?.payoutName ?? null;
  if (!pixKey || !pixName) {
    return NextResponse.json(
      { error: 'Informe os dados PIX para receber o pagamento (chave e nome do titular).' },
      { status: 400 }
    );
  }

  const withdrawal = await prisma.teamWithdrawal.create({
    data: {
      teamId,
      amountCents: totalCents,
      status: 'requested',
      requestedAt: now,
      pixKey,
      pixKeyType,
      pixName,
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

