import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createStripePaymentIntent } from '@/lib/payments/stripe';
import { isTeamResponsible } from '@/lib/access';
import { sponsorOrderCheckoutSchema } from '@/lib/validators/sponsorOrderSchema';
import { checkSponsorCheckoutRateLimit, incrementSponsorCheckoutRateLimit } from '@/lib/email/rateLimit';

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0.0.0.0';
}

/**
 * Cria pedido de patrocínio (SponsorOrder) e retorna clientSecret do Stripe para pagamento com cartão.
 * Se o usuário estiver logado, vincula o pedido à conta (para liberar acesso a Resultados aprovados).
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const allowed = await checkSponsorCheckoutRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente em 1 hora.' },
        { status: 429 }
      );
    }

    const session = await getSession();
    const body = await request.json();
    const parsed = sponsorOrderCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? 'Dados inválidos';
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const d = parsed.data;

    if (session?.userId) {
      const isResponsible = await isTeamResponsible(session.userId);
      if (isResponsible) {
        return NextResponse.json(
          { error: 'Esta conta é de responsável pelo time e não pode realizar compras. Para patrocinar, use uma conta de cliente (cadastro).' },
          { status: 403 }
        );
      }
    }

    const plan = await prisma.sponsorPlan.findUnique({ where: { id: d.sponsorPlanId } });
    if (!plan || !plan.isActive) {
      return NextResponse.json({ error: 'Plano não encontrado ou inativo' }, { status: 404 });
    }

    const amountCents = Math.round(plan.price * 100);
    let amountToTeamCents = 0;
    let partnerId: string | null = null;

    if (d.teamId && plan.teamPayoutPercent > 0) {
      amountToTeamCents = Math.round((amountCents * plan.teamPayoutPercent) / 100);
      const team = await prisma.team.findUnique({ where: { id: d.teamId } });
      if (!team || !team.isActive) {
        return NextResponse.json({ error: 'Time não encontrado ou inativo' }, { status: 400 });
      }
    }

    if (d.refCode && d.refCode.trim()) {
      const partner = await prisma.partner.findUnique({
        where: { refCode: d.refCode.trim() },
      });
      if (partner && partner.status === 'approved') {
        partnerId = partner.id;
      }
    }

    await incrementSponsorCheckoutRateLimit(ip);

    const order = await prisma.sponsorOrder.create({
      data: {
        sponsorPlanId: plan.id,
        teamId: d.teamId || null,
        userId: session?.userId ?? null,
        companyName: d.companyName.trim(),
        email: d.email.trim().toLowerCase(),
        websiteUrl: d.websiteUrl?.trim() || null,
        whatsapp: d.whatsapp?.replace(/\D/g, '') || null,
        instagram: d.instagram?.trim() || null,
        logoUrl: d.logoUrl.trim(),
        amountCents,
        amountToTeamCents,
        paymentStatus: 'pending',
        partnerId,
        utmSource: d.utmSource || null,
        utmMedium: d.utmMedium || null,
        utmCampaign: d.utmCampaign || null,
        utmContent: d.utmContent || null,
        utmTerm: d.utmTerm || null,
      },
    });

    const stripe = await createStripePaymentIntent({
      amount: amountCents,
      customerEmail: d.email.trim(),
      metadata: { sponsorOrderId: order.id },
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
      data: { paymentGateway: 'stripe', externalId: stripe.paymentIntentId },
    });

    return NextResponse.json({
      sponsorOrderId: order.id,
      clientSecret: stripe.clientSecret,
      amountCents,
    });
  } catch (e) {
    console.error('sponsor-checkout', e);
    return NextResponse.json({ error: 'Erro ao criar checkout' }, { status: 500 });
  }
}
