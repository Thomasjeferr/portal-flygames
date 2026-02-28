import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { hasFullAccess } from '@/lib/access';
import { prisma } from '@/lib/db';
import { createStripeSubscription, isStripeConfigured } from '@/lib/payments/stripe';
import { z } from 'zod';

const bodySchema = z.object({
  tournamentId: z.string().min(1),
  teamId: z.string().min(1),
});

/**
 * Checkout "Apoiar time" (GOAL): cria Stripe Subscription recorrente.
 * Só para torneios com registration_mode GOAL; time deve estar IN_GOAL.
 * Webhook invoice.paid cria TournamentSubscription e atualiza contagem da meta.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Faça login para continuar' }, { status: 401 });
  }

  const alreadySubscriber = await hasFullAccess(session.userId);
  if (alreadySubscriber) {
    return NextResponse.json(
      {
        error:
          'Você já é assinante do portal. O apoio por meta é voltado a novos torcedores. Obrigado por fazer parte da família!',
      },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    const { tournamentId, teamId } = parsed.data;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament || tournament.registrationMode !== 'GOAL') {
      return NextResponse.json({ error: 'Torneio não encontrado ou não é modo meta (GOAL)' }, { status: 404 });
    }

    const price = tournament.goalPricePerSupporter ?? 0;
    const amountCents = Math.round(price * 100);
    if (amountCents <= 0) {
      return NextResponse.json({ error: 'Valor por apoiador não configurado neste torneio' }, { status: 400 });
    }

    const tournamentTeam = await prisma.tournamentTeam.findUnique({
      where: { tournamentId_teamId: { tournamentId, teamId } },
      include: { team: true },
    });
    if (!tournamentTeam) {
      return NextResponse.json({ error: 'Time não está inscrito neste torneio' }, { status: 404 });
    }
    if (tournamentTeam.registrationType !== 'GOAL') {
      return NextResponse.json({ error: 'Este time não está no modo meta' }, { status: 400 });
    }
    if (tournamentTeam.teamStatus !== 'IN_GOAL' && tournamentTeam.teamStatus !== 'APPLIED') {
      return NextResponse.json(
        { error: 'Só é possível apoiar times em meta (IN_GOAL). Este time já está confirmado ou rejeitado.' },
        { status: 400 }
      );
    }

    const isManagerOfTeam = await prisma.teamManager.findUnique({
      where: { userId_teamId: { userId: session.userId, teamId } },
      select: { id: true },
    });
    if (isManagerOfTeam) {
      return NextResponse.json(
        {
          error:
            'O responsável ou gestor do time não pode participar da meta do próprio time. Apoie outro time ou peça a outro torcedor para apoiar.',
        },
        { status: 400 }
      );
    }

    const stripeResult = await createStripeSubscription({
      customerEmail: session.email ?? '',
      userId: session.userId,
      planId: 'tournament-goal',
      planName: `Apoio - ${tournament.name} - ${tournamentTeam.team.name}`,
      amountCents,
      periodicity: 'mensal',
      metadata: {
        tournamentId,
        teamId,
      },
    });
    if (!stripeResult) {
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

    return NextResponse.json({
      method: 'card',
      clientSecret: stripeResult.clientSecret,
      subscriptionId: stripeResult.subscriptionId,
      amountCents,
      tournamentName: tournament.name,
      teamName: tournamentTeam.team.name,
    });
  } catch (e) {
    console.error('[tournament-goal checkout]', e);
    return NextResponse.json({ error: 'Erro ao criar assinatura' }, { status: 500 });
  }
}
