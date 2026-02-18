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
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const { teamId } = parsed.data;

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      plan: { select: { price: true, teamPayoutPercent: true } },
    },
  });

  if (!purchase || purchase.userId !== session.userId) {
    return NextResponse.json({ error: 'Compra não encontrada' }, { status: 404 });
  }

  if (purchase.paymentStatus !== 'paid') {
    return NextResponse.json({ error: 'Só é possível vincular time em compras pagas.' }, { status: 400 });
  }

  if (!purchase.plan || purchase.plan.teamPayoutPercent <= 0) {
    return NextResponse.json(
      { error: 'Este plano não repassa percentual para time.' },
      { status: 400 }
    );
  }

  if (purchase.teamId || purchase.amountToTeamCents > 0) {
    return NextResponse.json(
      { error: 'Esta compra já possui time vinculado.' },
      { status: 400 }
    );
  }

  const existingEarning = await prisma.teamPlanEarning.findFirst({
    where: { purchaseId: purchase.id },
  });
  if (existingEarning) {
    return NextResponse.json(
      { error: 'Comissão para esta compra já foi gerada.' },
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

  const amountCents = Math.round(purchase.plan.price * 100);
  const amountToTeamCents = Math.round(
    (amountCents * purchase.plan.teamPayoutPercent) / 100
  );

  if (amountToTeamCents <= 0) {
    return NextResponse.json(
      { error: 'Valor de comissão para o time é zero.' },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.purchase.update({
      where: { id: purchase.id },
      data: {
        teamId: team.id,
        amountToTeamCents,
      },
    });

    await tx.teamPlanEarning.create({
      data: {
        teamId: team.id,
        purchaseId: purchase.id,
        amountCents: amountToTeamCents,
        status: 'pending',
      },
    });
  });

  return NextResponse.json({ ok: true });
}

