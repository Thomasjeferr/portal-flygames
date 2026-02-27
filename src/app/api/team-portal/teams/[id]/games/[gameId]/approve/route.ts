import { NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';
import { sendEmailToMany } from '@/lib/email/emailService';
import { normalizeAppBaseUrl } from '@/lib/email/emailService';
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
      const subject = `Súmula aprovada pelo outro time – ${title}`;
      const html = `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #0C1222;">Outro time aprovou a súmula</h2>
          <p>Olá,</p>
          <p>O time <strong>${approvingTeamName}</strong> aprovou a súmula do jogo <strong>${title}</strong>.</p>
          <p>Aguardamos sua aprovação para que a súmula seja oficial.</p>
          <p><a href="${painelUrl}" style="display: inline-block; padding: 12px 24px; background: #22C55E; color: #0C1222; text-decoration: none; font-weight: bold; border-radius: 8px;">Acessar painel e aprovar</a></p>
          <p>Atenciosamente,<br/>Fly Games</p>
        </div>
      `;
      await sendEmailToMany(otherEmails, subject, html).catch((e) => console.error('[Sumula] Email outro aprovou', e));
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
        const resultadosUrl = `${baseUrl}/resultados`;
        const subject = `Súmula aprovada por ambos os times – ${title}`;
        const html = `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
            <h2 style="color: #0C1222;">Súmula aprovada</h2>
            <p>Olá,</p>
            <p>A súmula do jogo <strong>${title}</strong> foi aprovada por ambos os times.</p>
            <p>Ela já pode ser visualizada em <strong>Resultados aprovados</strong>.</p>
            <p><a href="${resultadosUrl}" style="display: inline-block; padding: 12px 24px; background: #22C55E; color: #0C1222; text-decoration: none; font-weight: bold; border-radius: 8px;">Ver Resultados aprovados</a></p>
            <p>Atenciosamente,<br/>Fly Games</p>
          </div>
        `;
        await sendEmailToMany(allEmails, subject, html).catch((e) => console.error('[Sumula] Email ambos aprovaram', e));
      }
    }
  }

  return NextResponse.json({ ok: true });
}
