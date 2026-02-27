import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isTeamManager } from '@/lib/access';

/** Retorna se a inscrição do time no torneio já está paga. */
export async function GET(
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
    include: { tournament: true, team: true },
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

  return NextResponse.json({ paid: tt.paymentStatus === 'paid' });
}
