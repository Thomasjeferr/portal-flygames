import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isTeamResponsible, hasActiveRecurringAccess, hasFullAccess, hasActiveCompanySponsor } from '@/lib/access';
import { clearPaymentConfigCache } from '@/lib/payment-config';
import { createWooviCharge } from '@/lib/payments/woovi';
import { createStripePaymentIntent, createStripeSubscription } from '@/lib/payments/stripe';
import { z } from 'zod';

const bodySchema = z.object({
  planId: z.string().min(1),
  gameId: z.string().optional(),
  teamId: z.string().nullable().optional(),
  method: z.enum(['pix', 'card']),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
  refCode: z.string().optional(),
});

/**
 * Cria intenção de compra: registra Purchase (pending) e retorna dados para pagamento (Pix ou Stripe).
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Faça login para continuar' }, { status: 401 });
  }
  if (session.role === 'club_viewer') {
    return NextResponse.json(
      { error: 'Esta conta é apenas para acesso à pré-estreia. Para comprar planos ou jogos, crie uma conta no site.' },
      { status: 403 }
    );
  }

  const isResponsible = await isTeamResponsible(session.userId);
  if (isResponsible) {
    return NextResponse.json(
      { error: 'Esta conta é de responsável pelo time e não pode realizar compras. Para assinar ou comprar jogos, saia e crie uma conta de cliente (cadastro).' },
      { status: 403 }
    );
  }

  // Quem já tem acesso total (assinatura ou patrocínio empresarial) não pode comprar outros planos ou jogos.
  const fullAccess = await hasFullAccess(session.userId);
  if (fullAccess) {
    return NextResponse.json(
      { error: 'Você já tem acesso total ao conteúdo (assinatura ou patrocínio empresarial). Não é necessário comprar outros planos ou jogos.' },
      { status: 403 }
    );
  }

  try {
    clearPaymentConfigCache();
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const { planId, gameId, teamId, method, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, refCode } = parsed.data;

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) {
      return NextResponse.json({ error: 'Plano não encontrado ou inativo' }, { status: 404 });
    }

    if (plan.type === 'unitario' && !gameId) {
      return NextResponse.json({ error: 'Plano unitário exige gameId' }, { status: 400 });
    }

    // Quem tem assinatura ou patrocínio recorrente ativo tem acesso livre ao conteúdo → não pode comprar jogo avulso.
    if (plan.type === 'unitario' && gameId) {
      const recurringActive = await hasActiveRecurringAccess(session.userId, session.email);
      if (recurringActive) {
        return NextResponse.json(
          { error: 'Você já tem acesso ao conteúdo pela sua assinatura ou patrocínio ativo. Não é necessário comprar jogo avulso.' },
          { status: 403 }
        );
      }
      const existingGamePurchase = await prisma.purchase.findFirst({
        where: {
          userId: session.userId,
          gameId,
          paymentStatus: 'paid',
          plan: { active: true },
          OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
        },
        select: { id: true },
      });
      if (existingGamePurchase) {
        return NextResponse.json(
          { error: 'Você já possui acesso a este jogo. Confira em "Minha conta" > Histórico de compras.' },
          { status: 403 }
        );
      }
    }

    // Bloquear nova assinatura recorrente se o usuário já tem assinatura ativa (evitar cobrança duplicada).
    // Também bloquear se tiver patrocínio empresarial ativo (não pode assinar plano Patrocinador/torcedor).
    if (plan.type === 'recorrente') {
      const hasCompanySponsor = await hasActiveCompanySponsor(session.userId, session.email);
      if (hasCompanySponsor) {
        return NextResponse.json(
          {
            error:
              'Você já possui patrocínio empresarial ativo. Quem tem patrocínio empresarial não pode assinar o plano Patrocinador/torcedor. Para alterar de plano empresarial, acesse Minha conta.',
          },
          { status: 403 }
        );
      }
      const existingSub = await prisma.subscription.findUnique({
        where: { userId: session.userId },
        include: { plan: { select: { id: true, name: true } } },
      });
      const now = new Date();
      const isActive = !!existingSub?.active && existingSub.endDate >= now;
      if (isActive) {
        if (existingSub.planId === planId) {
          return NextResponse.json(
            { error: 'Você já assina este plano. Acesse sua conta para ver sua assinatura ou cancele para assinar novamente após o fim do período.' },
            { status: 403 }
          );
        }
        return NextResponse.json(
          { error: 'Você já tem uma assinatura ativa. Para trocar de plano, use "Trocar plano" na sua conta ou cancele a assinatura atual.' },
          { status: 403 }
        );
      }
    }

    // Regras de forma de pagamento:
    // - Jogos avulsos (type === 'unitario'): Pix e cartão permitidos
    // - Planos mensais/anuais (outros tipos): apenas cartão
    if (method === 'pix' && plan.type !== 'unitario') {
      return NextResponse.json(
        { error: 'Pix disponível apenas para compra de jogos avulsos.' },
        { status: 400 }
      );
    }

    const amountCents = Math.round(plan.price * 100);
    let amountToTeamCents = 0;
    let partnerId: string | null = null;
    let chosenTeamId: string | null = null;

    // Se o usuário escolheu um time no checkout, validamos e:
    // - usamos para comissão (amountToTeamCents) quando o plano tem teamPayoutPercent
    // - salvamos como time do coração do usuário (favoriteTeamId), independente do tipo de plano
    if (teamId) {
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (team && team.isActive) {
        chosenTeamId = team.id;

        if (plan.teamPayoutPercent > 0) {
          amountToTeamCents = Math.round((amountCents * plan.teamPayoutPercent) / 100);
        }

        // Atualiza imediatamente o time do coração; só começa a contar para meta/comissão
        // quando a assinatura estiver ativa ou a compra for paga.
        await prisma.user.update({
          where: { id: session.userId },
          data: { favoriteTeamId: chosenTeamId },
        });
      }
    }

    if (refCode && refCode.trim()) {
      const partner = await prisma.partner.findUnique({
        where: { refCode: refCode.trim() },
      });
      if (partner && partner.status === 'approved') {
        partnerId = partner.id;
      }
    }

    // Assinatura recorrente com cartão: criar Stripe Subscription (cobrança automática).
    // O primeiro pagamento e as renovações são tratados no webhook invoice.paid (usa favoriteTeamId).
    const isRecurringCard = plan.type === 'recorrente' && method === 'card';
    if (isRecurringCard) {
      const stripeSub = await createStripeSubscription({
        customerEmail: session.email,
        userId: session.userId,
        planId,
        planName: plan.name,
        amountCents,
        periodicity: plan.periodicity ?? 'mensal',
        metadata: {},
      });
      if (stripeSub) {
        return NextResponse.json({
          purchaseId: null,
          method: 'card',
          clientSecret: stripeSub.clientSecret,
          subscriptionId: stripeSub.subscriptionId,
          isSubscription: true,
        });
      }
      // Se Stripe Subscription falhar, cai no fluxo de PaymentIntent abaixo (pagamento único)
    }

    let expiresAt: Date | null = null;
    if (plan.duracaoDias != null) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + plan.duracaoDias);
    }

    const purchase = await prisma.purchase.create({
      data: {
        userId: session.userId,
        planId,
        gameId: plan.type === 'unitario' ? gameId : null,
        teamId: amountToTeamCents > 0 && chosenTeamId ? chosenTeamId : null,
        partnerId,
        amountCents,
        amountToTeamCents,
        paymentStatus: 'pending',
        expiresAt,
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        utmContent: utmContent || null,
        utmTerm: utmTerm || null,
      },
    });

    if (method === 'pix') {
      const woovi = await createWooviCharge({
        amount: amountCents,
        customer: session.email,
        customerName: session.name ?? undefined,
        description: `Fly Games - ${plan.name}`,
        externalId: purchase.id,
      });
      if (woovi) {
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: { paymentGateway: 'woovi', externalId: woovi.id },
        });
        return NextResponse.json({
          purchaseId: purchase.id,
          method: 'pix',
          qrCode: woovi.qrCode,
          qrCodeImage: woovi.qrCodeImage,
          expiresAt: woovi.expiresAt,
        });
      }
    }

    if (method === 'card') {
      const stripe = await createStripePaymentIntent({
        amount: amountCents,
        customerEmail: session.email,
        metadata: {
          purchaseId: purchase.id,
          userId: session.userId,
          planId,
          ...(gameId && { gameId }),
        },
      });
      if (stripe) {
        await prisma.purchase.update({
          where: { id: purchase.id },
          data: { paymentGateway: 'stripe', externalId: stripe.paymentIntentId },
        });
        return NextResponse.json({
          purchaseId: purchase.id,
          method: 'card',
          clientSecret: stripe.clientSecret,
        });
      }
    }

    await prisma.purchase.update({
      where: { id: purchase.id },
      data: { paymentStatus: 'failed' },
    });
    const msg =
      method === 'pix'
        ? 'Pix indisponível. Configure a chave da API Woovi em Admin > Pagamentos.'
        : 'Cartão indisponível. Configure o Stripe em Admin > Pagamentos.';
    return NextResponse.json(
      { error: msg },
      { status: 503 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao criar checkout' }, { status: 500 });
  }
}
