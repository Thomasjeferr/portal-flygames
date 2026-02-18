import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const bodySchema = z.object({
  teamId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const { teamId } = parsed.data;

  const order = await prisma.sponsorOrder.findUnique({
    where: { id },
    include: {
      sponsorPlan: { select: { price: true, teamPayoutPercent: true } },
      earnings: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  }

  if (order.paymentStatus !== 'paid') {
    return NextResponse.json(
      { error: 'Só é possível vincular time em pedidos pagos.' },
      { status: 400 }
    );
  }

  if (!order.sponsorPlan || order.sponsorPlan.teamPayoutPercent <= 0) {
    return NextResponse.json(
      { error: 'O plano de patrocínio não repassa percentual para time.' },
      { status: 400 }
    );
  }

  if (order.teamId || order.amountToTeamCents > 0 || order.earnings.length > 0) {
    return NextResponse.json(
      { error: 'Este pedido já possui time/comissão vinculados.' },
      { status: 400 }
    );
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, isActive: true },
  });

  if (!team || !team.isActive) {
    return NextResponse.json(
      { error: 'Time não encontrado ou inativo.' },
      { status: 400 }
    );
  }

  const amountCents = Math.round(order.sponsorPlan.price * 100);
  const amountToTeamCents = Math.round(
    (amountCents * order.sponsorPlan.teamPayoutPercent) / 100
  );

  if (amountToTeamCents <= 0) {
    return NextResponse.json(
      { error: 'Valor de comissão para o time é zero.' },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.sponsorOrder.update({
      where: { id: order.id },
      data: {
        teamId: team.id,
        amountToTeamCents,
      },
    });

    await tx.teamSponsorshipEarning.create({
      data: {
        teamId: team.id,
        sponsorOrderId: order.id,
        amountCents: amountToTeamCents,
        status: 'pending',
      },
    });
  });

  return NextResponse.json({ ok: true });
}

