import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** Marca saque de time como pago (admin). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { id } = await params;

  const withdrawal = await prisma.teamWithdrawal.findUnique({
    where: { id },
    include: {
      planItems: {
        include: { earning: true },
      },
      sponsorshipItems: {
        include: { earning: true },
      },
      goalItems: {
        include: { earning: true },
      },
    },
  });

  if (!withdrawal) {
    return NextResponse.json({ error: 'Saque não encontrado' }, { status: 404 });
  }
  if (withdrawal.status === 'paid') {
    return NextResponse.json({ error: 'Saque já está marcado como pago' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const paymentReference =
    typeof body.paymentReference === 'string' ? body.paymentReference.trim() || null : null;

  let paidAt: Date | null = null;
  if (typeof body.paidAt === 'string') {
    const d = new Date(body.paidAt);
    if (!Number.isNaN(d.getTime())) {
      paidAt = d;
    }
  }
  if (!paidAt) {
    paidAt = new Date();
  }

  await prisma.$transaction(async (tx) => {
    await tx.teamWithdrawal.update({
      where: { id },
      data: { status: 'paid', paidAt, paymentReference },
    });

    const planEarningIds = withdrawal.planItems.map((item) => item.earningId);
    if (planEarningIds.length) {
      await tx.teamPlanEarning.updateMany({
        where: { id: { in: planEarningIds } },
        data: { status: 'paid', paidAt, paymentReference },
      });
    }

    const sponsorshipEarningIds = withdrawal.sponsorshipItems.map((item) => item.earningId);
    if (sponsorshipEarningIds.length) {
      await tx.teamSponsorshipEarning.updateMany({
        where: { id: { in: sponsorshipEarningIds } },
        data: { status: 'paid', paidAt, paymentReference },
      });
    }

    const goalEarningIds = withdrawal.goalItems.map((item) => item.earningId);
    if (goalEarningIds.length) {
      await tx.teamTournamentGoalEarning.updateMany({
        where: { id: { in: goalEarningIds } },
        data: { status: 'paid', paidAt, paymentReference },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

