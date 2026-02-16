import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createWooviCharge } from '@/lib/payments/woovi';
import { createStripePaymentIntent } from '@/lib/payments/stripe';
import { z } from 'zod';

const bodySchema = z.object({
  planId: z.string().min(1),
  gameId: z.string().optional(),
  teamId: z.string().nullable().optional(),
  method: z.enum(['pix', 'card']),
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

  const isTeamManager = await prisma.teamManager.count({ where: { userId: session.userId } }).then((n) => n > 0);
  if (isTeamManager) {
    return NextResponse.json(
      { error: 'Esta conta é de responsável pelo time e não pode realizar compras. Para assinar ou comprar jogos, saia e crie uma conta de cliente (cadastro).' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const { planId, gameId, teamId, method } = parsed.data;

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) {
      return NextResponse.json({ error: 'Plano não encontrado ou inativo' }, { status: 404 });
    }

    if (plan.type === 'unitario' && !gameId) {
      return NextResponse.json({ error: 'Plano unitário exige gameId' }, { status: 400 });
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

    if (teamId && plan.teamPayoutPercent > 0) {
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (team && team.isActive) {
        amountToTeamCents = Math.round((amountCents * plan.teamPayoutPercent) / 100);
      }
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
        teamId: amountToTeamCents > 0 ? teamId : null,
        amountToTeamCents,
        paymentStatus: 'pending',
        expiresAt,
      },
    });

    if (method === 'pix') {
      const woovi = await createWooviCharge({
        amount: amountCents,
        customer: session.email,
        description: `Fly Games - ${plan.name}`,
        externalId: purchase.id,
        expiresIn: 3600,
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
    return NextResponse.json(
      { error: 'Método de pagamento indisponível. Configure Woovi (Pix) ou Stripe (cartão) no servidor.' },
      { status: 503 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao criar checkout' }, { status: 500 });
  }
}
