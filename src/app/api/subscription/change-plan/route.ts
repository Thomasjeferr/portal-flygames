import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createStripeSubscription } from '@/lib/payments/stripe';
import { z } from 'zod';

const bodySchema = z.object({ newPlanId: z.string().min(1) });

/**
 * Troca de plano: cria nova assinatura no Stripe para o novo plano.
 * O usuário paga a primeira cobrança; no webhook invoice.paid a assinatura antiga é cancelada e a nova é ativada.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Faça login para continuar' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Informe o novo plano (newPlanId)' }, { status: 400 });
  }
  const { newPlanId } = parsed.data;

  const [currentSub, newPlan] = await Promise.all([
    prisma.subscription.findUnique({
      where: { userId: session.userId },
      include: { plan: { select: { id: true, name: true } } },
    }),
    prisma.plan.findUnique({ where: { id: newPlanId } }),
  ]);

  const now = new Date();
  const isActive = !!currentSub?.active && currentSub.endDate >= now;
  if (!isActive || !currentSub) {
    return NextResponse.json(
      { error: 'Você não tem uma assinatura ativa. Use a página de planos para assinar.' },
      { status: 403 }
    );
  }
  if (!newPlan || !newPlan.active || newPlan.type !== 'recorrente') {
    return NextResponse.json({ error: 'Plano não encontrado ou não é um plano recorrente' }, { status: 404 });
  }
  if (currentSub.planId === newPlanId) {
    return NextResponse.json(
      { error: 'Você já assina este plano. Não é necessário trocar.' },
      { status: 400 }
    );
  }

  const amountCents = Math.round(newPlan.price * 100);
  const stripeSub = await createStripeSubscription({
    customerEmail: session.email,
    userId: session.userId,
    planId: newPlan.id,
    planName: newPlan.name,
    amountCents,
    periodicity: newPlan.periodicity ?? 'mensal',
    metadata: {},
  });

  if (!stripeSub) {
    return NextResponse.json(
      { error: 'Não foi possível criar a nova assinatura. Tente novamente ou use a página de planos.' },
      { status: 503 }
    );
  }

  return NextResponse.json({
    method: 'card',
    clientSecret: stripeSub.clientSecret,
    subscriptionId: stripeSub.subscriptionId,
    isSubscription: true,
    planName: newPlan.name,
  });
}
