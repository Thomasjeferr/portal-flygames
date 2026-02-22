import { NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';

/**
 * POST /api/team-portal/teams/[id]/games/[gameId]/approve
 * Time aprova a súmula do jogo.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; gameId: string }> }
) {
  const { id: teamId, gameId } = await params;
  const hasAccess = await getTeamAccess(teamId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const game = await prisma.game.findFirst({
    where: {
      id: gameId,
      OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
    },
    select: { id: true, sumulaPublishedAt: true },
  });
  if (!game) {
    return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });
  }
  if (!game.sumulaPublishedAt) {
    return NextResponse.json({ error: 'Súmula ainda não foi publicada pelo organizador' }, { status: 400 });
  }

  await prisma.gameSumulaApproval.upsert({
    where: { gameId_teamId: { gameId, teamId } },
    create: { gameId, teamId, status: 'APROVADA', approvedAt: new Date() },
    update: { status: 'APROVADA', approvedAt: new Date(), rejectionReason: null, rejectedAt: null },
  });

  return NextResponse.json({ ok: true });
}
