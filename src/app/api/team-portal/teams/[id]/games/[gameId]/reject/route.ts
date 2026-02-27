import { NextRequest, NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';
import { sendTransactionalEmail, normalizeAppBaseUrl } from '@/lib/email/emailService';
import { getTeamResponsibleEmails } from '@/lib/email/teamEmails';
import { z } from 'zod';

const bodySchema = z.object({
  reason: z.string().min(1, 'Informe o motivo da rejeição'),
});

/**
 * POST /api/team-portal/teams/[id]/games/[gameId]/reject
 * Time rejeita a súmula (motivo obrigatório; visível ao admin e ao outro time).
 */
export async function POST(
  request: NextRequest,
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

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Motivo obrigatório' },
      { status: 400 }
    );
  }

  await prisma.gameSumulaApproval.upsert({
    where: { gameId_teamId: { gameId, teamId } },
    create: {
      gameId,
      teamId,
      status: 'REJEITADA',
      rejectionReason: parsed.data.reason.trim(),
      rejectedAt: new Date(),
    },
    update: {
      status: 'REJEITADA',
      rejectionReason: parsed.data.reason.trim(),
      rejectedAt: new Date(),
      approvedAt: null,
    },
  });

  const gameWithTeams = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      title: true,
      homeTeamId: true,
      awayTeamId: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
    },
  });
  const reason = parsed.data.reason.trim();
  if (gameWithTeams?.homeTeamId && gameWithTeams?.awayTeamId) {
    const otherTeamId = gameWithTeams.homeTeamId === teamId ? gameWithTeams.awayTeamId : gameWithTeams.homeTeamId;
    const rejectingTeamName =
      gameWithTeams.homeTeamId === teamId
        ? gameWithTeams.homeTeam?.name ?? 'Mandante'
        : gameWithTeams.awayTeam?.name ?? 'Visitante';
    const title = gameWithTeams.title || 'Jogo';
    const otherEmails = otherTeamId ? await getTeamResponsibleEmails(otherTeamId) : [];
    if (otherEmails.length > 0) {
      const settings = await prisma.emailSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
      const baseUrl = normalizeAppBaseUrl(settings?.appBaseUrl);
      const painelUrl = `${baseUrl}/painel-time/times/${otherTeamId}/sumulas`;
      const reasonEscaped = reason
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      const vars = {
        title,
        rejecting_team_name: rejectingTeamName,
        rejection_reason: reasonEscaped,
        painel_url: painelUrl,
      };
      await Promise.all(
        otherEmails.map((to) =>
          sendTransactionalEmail({ to, templateKey: 'SUMULA_OUTRO_REJEITOU', vars }).catch((e) =>
            console.error('[Sumula] Email outro rejeitou', e)
          )
        )
      );
    }
  }

  return NextResponse.json({ ok: true });
}
