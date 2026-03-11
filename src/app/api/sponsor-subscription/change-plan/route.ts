import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createStripeSponsorSubscription } from '@/lib/payments/stripe';
import { z } from 'zod';

const bodySchema = z.object({ newSponsorPlanId: z.string().min(1) });

/**
 * Upgrade/troca de plano empresarial: usuário já tem patrocínio empresarial ativo.
 * Cria novo SponsorOrder (cópia dos dados do atual) + nova assinatura Stripe.
 * No webhook invoice.paid da nova assinatura, a assinatura antiga é marcada para cancelar no fim do período.
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
    return NextResponse.json({ error: 'Informe o novo plano (newSponsorPlanId)' }, { status: 400 });
  }
  const { newSponsorPlanId } = parsed.data;

  const now = new Date();
  const emailNorm = session.email?.trim().toLowerCase() ?? '';

  // Pedido atual com patrocínio empresarial ativo (único)
  const currentOrders = await prisma.sponsorOrder.findMany({
    where: {
      paymentStatus: 'paid',
      sponsorPlan: { type: 'sponsor_company', isActive: true },
      OR: [{ userId: session.userId }, ...(emailNorm ? [{ email: { equals: emailNorm, mode: 'insensitive' as const } }] : [])],
    },
    include: {
      sponsorPlan: { select: { id: true, name: true, price: true, billingPeriod: true, teamPayoutPercent: true } },
      sponsor: { select: { id: true, isActive: true, endAt: true } },
    },
  });

  const currentOrder = currentOrders.find(
    (o) => o.sponsor?.isActive && o.sponsor.endAt && new Date(o.sponsor.endAt) >= now
  );
  if (!currentOrder) {
    return NextResponse.json(
      { error: 'Você não tem um patrocínio empresarial ativo. Use a página de patrocínio para contratar.' },
      { status: 403 }
    );
  }

  const newPlan = await prisma.sponsorPlan.findUnique({
    where: { id: newSponsorPlanId },
  });
  if (!newPlan || !newPlan.isActive || newPlan.type !== 'sponsor_company') {
    return NextResponse.json({ error: 'Plano não encontrado ou não é um plano empresarial ativo' }, { status: 404 });
  }
  if (currentOrder.sponsorPlanId === newSponsorPlanId) {
    return NextResponse.json(
      { error: 'Você já está neste plano. Não é necessário trocar.' },
      { status: 400 }
    );
  }

  const amountCents = Math.round(newPlan.price * 100);
  let amountToTeamCents = 0;
  if (currentOrder.teamId && (newPlan.teamPayoutPercent ?? 0) > 0) {
    amountToTeamCents = Math.round((amountCents * (newPlan.teamPayoutPercent ?? 0)) / 100);
    const team = await prisma.team.findUnique({ where: { id: currentOrder.teamId }, select: { id: true, isActive: true } });
    if (!team || !team.isActive) {
      amountToTeamCents = 0;
    }
  }

  const requiresAcceptance = newPlan.requireContractAcceptance || (newPlan.hasLoyalty && (newPlan.loyaltyMonths ?? 0) > 0);
  const contractVersion = '1';
  const contractSnapshot = requiresAcceptance
    ? [
        'Tipo: Patrocínio empresarial',
        newPlan.hasLoyalty && (newPlan.loyaltyMonths ?? 0) > 0 ? `Fidelidade mínima: ${newPlan.loyaltyMonths} meses` : null,
        newPlan.loyaltyNoticeText?.trim() || null,
        `Recorrência: ${newPlan.billingPeriod === 'monthly' ? 'mensal' : newPlan.billingPeriod === 'quarterly' ? 'trimestral' : 'anual'}`,
      ]
        .filter(Boolean)
        .join('. ')
    : null;

  const order = await prisma.sponsorOrder.create({
    data: {
      sponsorPlanId: newPlan.id,
      teamId: currentOrder.teamId,
      userId: session.userId,
      companyName: currentOrder.companyName,
      cnpj: currentOrder.cnpj,
      email: currentOrder.email,
      websiteUrl: currentOrder.websiteUrl,
      whatsapp: currentOrder.whatsapp,
      instagram: currentOrder.instagram,
      logoUrl: currentOrder.logoUrl,
      amountCents,
      amountToTeamCents,
      paymentStatus: 'pending',
      partnerId: null,
      contractAcceptedAt: requiresAcceptance ? new Date() : null,
      contractVersion: requiresAcceptance ? contractVersion : null,
      contractSnapshot: contractSnapshot ?? null,
    },
  });

  const stripe = await createStripeSponsorSubscription({
    customerEmail: currentOrder.email.trim(),
    sponsorOrderId: order.id,
    planName: newPlan.name,
    amountCents,
    billingPeriod: newPlan.billingPeriod,
  });

  if (!stripe) {
    await prisma.sponsorOrder.update({
      where: { id: order.id },
      data: { paymentStatus: 'failed' },
    });
    return NextResponse.json(
      { error: 'Pagamento com cartão indisponível. Tente mais tarde.' },
      { status: 503 }
    );
  }

  await prisma.sponsorOrder.update({
    where: { id: order.id },
    data: { paymentGateway: 'stripe', externalId: stripe.subscriptionId },
  });

  return NextResponse.json({
    sponsorOrderId: order.id,
    clientSecret: stripe.clientSecret,
    amountCents,
    planName: newPlan.name,
    isSubscription: true,
  });
}
