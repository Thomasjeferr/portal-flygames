import { NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';

/**
 * GET /api/team-portal/teams/[id]/games/[gameId]
 * Detalhe do jogo para súmula no painel do time.
 * Só retorna se o time for mandante ou visitante.
 * Retorna apenas os campos preenchidos (no front só exibe o que vier).
 */
export async function GET(
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
    select: {
      id: true,
      title: true,
      slug: true,
      championship: true,
      gameDate: true,
      description: true,
      thumbnailUrl: true,
      homeScore: true,
      awayScore: true,
      venue: true,
      referee: true,
      homeTeamId: true,
      awayTeamId: true,
      homeTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
      awayTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
    },
  });

  if (!game) {
    return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });
  }

  return NextResponse.json({
    ...game,
    gameDate: game.gameDate.toISOString(),
  });
}
