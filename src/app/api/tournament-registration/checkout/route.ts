import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createWooviCharge } from '@/lib/payments/woovi';
import { createStripePaymentIntent, isStripeConfigured } from '@/lib/payments/stripe';
import { z } from 'zod';
import { isTeamManager } from '@/lib/access';

const bodySchema = z.object({
  tournamentId: z.string().min(1),
  teamId: z.string().min(1),
  method: z.enum(['pix', 'card']),
});

/**
 * Cria pagamento para inscrição paga em torneio (registration_mode PAID).
 * PIX: Woovi (qrCode etc.); confirmação via webhook Woovi ou sync.
 * Cartão: Stripe PaymentIntent (pagamento único); confirmação via webhook payment_intent.succeeded.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Faça login para continuar' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    const { tournamentId, teamId, method } = parsed.data;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament || tournament.registrationMode !== 'PAID') {
      return NextResponse.json({ error: 'Torneio não encontrado ou inscrição não é paga' }, { status: 404 });
    }

    const fee = tournament.registrationFeeAmount ?? 0;
    const amountCents = Math.round(fee * 100);
    if (amountCents <= 0) {
      return NextResponse.json({ error: 'Valor da inscrição não configurado' }, { status: 400 });
    }

    const tournamentTeam = await prisma.tournamentTeam.findUnique({
      where: { tournamentId_teamId: { tournamentId, teamId } },
      include: { tournament: true, team: true },
    });
    if (!tournamentTeam) {
      return NextResponse.json({ error: 'Time não está inscrito neste torneio' }, { status: 404 });
    }
    if (tournamentTeam.teamStatus === 'CONFIRMED' && tournamentTeam.paymentStatus === 'paid') {
      return NextResponse.json({ error: 'Inscrição já está paga e confirmada' }, { status: 400 });
    }
    if (tournamentTeam.paymentStatus === 'pending' && tournamentTeam.paymentExternalId) {
      return NextResponse.json(
        { error: 'Já existe um pagamento em andamento. Aguarde ou tente novamente em alguns minutos.' },
        { status: 400 }
      );
    }

    const isAdmin = session.role === 'admin';
    if (!isAdmin) {
      const canManage = await isTeamManager(session.userId, teamId);
      if (!canManage) {
        return NextResponse.json({ error: 'Você não tem permissão para pagar a inscrição deste time' }, { status: 403 });
      }
    }

    if (method === 'pix') {
      const woovi = await createWooviCharge({
        amount: amountCents,
        customer: session.email ?? '',
        customerName: session.name ?? undefined,
        description: `Inscrição - ${tournament.name} - ${tournamentTeam.team.name}`,
        externalId: tournamentTeam.id,
      });
      if (!woovi) {
        return NextResponse.json(
          { error: 'PIX indisponível. Configure a Woovi em Admin > Pagamentos.' },
          { status: 503 }
        );
      }
      await prisma.tournamentTeam.update({
        where: { tournamentId_teamId: { tournamentId, teamId } },
        data: {
          paymentStatus: 'pending',
          paymentGateway: 'woovi',
          paymentExternalId: woovi.id,
        },
      });
      return NextResponse.json({
        tournamentTeamId: tournamentTeam.id,
        method: 'pix',
        qrCode: woovi.qrCode,
        qrCodeImage: woovi.qrCodeImage,
        expiresAt: woovi.expiresAt,
        amountCents,
        tournamentName: tournament.name,
        teamName: tournamentTeam.team.name,
      });
    }

    if (method === 'card') {
      const stripe = await createStripePaymentIntent({
        amount: amountCents,
        customerEmail: session.email ?? undefined,
        metadata: {
          tournamentId,
          teamId,
          tournamentTeamId: tournamentTeam.id,
          userId: session.userId,
        },
      });
      if (!stripe) {
        const configured = await isStripeConfigured();
        return NextResponse.json(
          {
            error: configured
              ? 'Não foi possível iniciar o pagamento com cartão. Tente novamente ou verifique sua conta Stripe (Admin > Pagamentos).'
              : 'Cartão indisponível. Configure o Stripe em Admin > Pagamentos.',
          },
          { status: 503 }
        );
      }
      await prisma.tournamentTeam.update({
        where: { tournamentId_teamId: { tournamentId, teamId } },
        data: {
          paymentStatus: 'pending',
          paymentGateway: 'stripe',
          paymentExternalId: stripe.paymentIntentId,
        },
      });
      return NextResponse.json({
        tournamentTeamId: tournamentTeam.id,
        method: 'card',
        clientSecret: stripe.clientSecret,
        amountCents,
        tournamentName: tournament.name,
        teamName: tournamentTeam.team.name,
      });
    }

    return NextResponse.json({ error: 'Método inválido' }, { status: 400 });
  } catch (e) {
    console.error('[tournament-registration checkout]', e);
    return NextResponse.json({ error: 'Erro ao criar pagamento' }, { status: 500 });
  }
}
