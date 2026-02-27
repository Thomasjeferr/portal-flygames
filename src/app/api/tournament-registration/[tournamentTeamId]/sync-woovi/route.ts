import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getWooviChargeStatus } from '@/lib/payments/woovi';
import { markTournamentRegistrationAsPaidById } from '@/lib/tournamentRegistrationPayment';
import { isTeamManager } from '@/lib/access';

/**
 * Sincroniza status da inscrição PIX (Woovi) com a API.
 * Chamado pelo front quando o usuário está aguardando confirmação do PIX.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ tournamentTeamId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const tournamentTeamId = (await params).tournamentTeamId;
  const tt = await prisma.tournamentTeam.findUnique({
    where: { id: tournamentTeamId },
    select: { id: true, paymentStatus: true, paymentGateway: true, paymentExternalId: true, teamId: true },
  });

  if (!tt) {
    return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 });
  }

  const isAdmin = session.role === 'admin';
  if (!isAdmin) {
    const canManage = await isTeamManager(session.userId, tt.teamId);
    if (!canManage) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }
  }

  if (tt.paymentStatus === 'paid') {
    return NextResponse.json({ paid: true, synced: false });
  }

  if (tt.paymentGateway !== 'woovi' || !tt.paymentExternalId) {
    return NextResponse.json({ paid: false, synced: false });
  }

  try {
    const charge = await getWooviChargeStatus(tt.paymentExternalId);
    if (!charge) {
      return NextResponse.json({ paid: false, synced: false });
    }

    const status = (charge as { status?: string }).status ?? '';
    if (status === 'COMPLETED') {
      await markTournamentRegistrationAsPaidById(tournamentTeamId);
      return NextResponse.json({ paid: true, synced: true });
    }

    return NextResponse.json({ paid: false, synced: true, status });
  } catch (e) {
    console.error('[tournament-registration sync-woovi]', e);
    return NextResponse.json(
      { error: 'Erro ao sincronizar com Woovi', paid: false, synced: false },
      { status: 500 }
    );
  }
}
