import { NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';
import { sendTransactionalEmail, normalizeAppBaseUrl } from '@/lib/email/emailService';
import { getTeamResponsibleEmails } from '@/lib/email/teamEmails';

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

  const gameWithTeams = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      title: true,
      homeTeamId: true,
      awayTeamId: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
      sumulaApprovals: { select: { teamId: true, status: true } },
    },
  });
  if (gameWithTeams?.homeTeamId && gameWithTeams?.awayTeamId) {
    const settings = await prisma.emailSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
    const baseUrl = normalizeAppBaseUrl(settings?.appBaseUrl);
    const title = gameWithTeams.title || 'Jogo';
    const otherTeamId = gameWithTeams.homeTeamId === teamId ? gameWithTeams.awayTeamId : gameWithTeams.homeTeamId;
    const approvingTeamName =
      gameWithTeams.homeTeamId === teamId
        ? gameWithTeams.homeTeam?.name ?? 'Mandante'
        : gameWithTeams.awayTeam?.name ?? 'Visitante';

    const otherEmails = otherTeamId ? await getTeamResponsibleEmails(otherTeamId) : [];
    if (otherEmails.length > 0) {
      const painelUrl = `${baseUrl}/painel-time/times/${otherTeamId}/sumulas`;
      const vars = {
        title,
        approving_team_name: approvingTeamName,
        painel_url: painelUrl,
      };
      await Promise.all(
        otherEmails.map((to) =>
          sendTransactionalEmail({ to, templateKey: 'SUMULA_OUTRO_APROVOU', vars }).catch((e) =>
            console.error('[Sumula] Email outro aprovou', e)
          )
        )
      );
    }

    const bothApproved =
      gameWithTeams.sumulaApprovals.length === 2 &&
      gameWithTeams.sumulaApprovals.every((a) => a.status === 'APROVADA');
    if (bothApproved) {
      const [homeEmails, awayEmails] = await Promise.all([
        getTeamResponsibleEmails(gameWithTeams.homeTeamId),
        getTeamResponsibleEmails(gameWithTeams.awayTeamId),
      ]);
      const allEmails = Array.from(new Set([...homeEmails, ...awayEmails]));
      if (allEmails.length > 0) {
        const settings = await prisma.emailSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
        const baseUrl = normalizeAppBaseUrl(settings?.appBaseUrl);
        const resultadosUrl = `${baseUrl}/resultados`;
        const title = gameWithTeams.title || 'Jogo';
        const vars = { title, resultados_url: resultadosUrl };
        await Promise.all(
          allEmails.map((to) =>
            sendTransactionalEmail({ to, templateKey: 'SUMULA_APROVADA_AMBOS', vars }).catch((e) =>
              console.error('[Sumula] Email ambos aprovaram', e)
            )
          )
        );
      }
    }
  }

  return NextResponse.json({ ok: true });
}
