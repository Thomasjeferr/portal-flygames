import { NextRequest, NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';
import { sendEmailToMany } from '@/lib/email/emailService';
import { normalizeAppBaseUrl } from '@/lib/email/emailService';
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
      const subject = `Súmula rejeitada pelo outro time – ${title}`;
      const reasonEscaped = reason
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
      const html = `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #0C1222;">Outro time rejeitou a súmula</h2>
          <p>Olá,</p>
          <p>O time <strong>${rejectingTeamName}</strong> rejeitou a súmula do jogo <strong>${title}</strong>.</p>
          <p><strong>Motivo:</strong> ${reasonEscaped}</p>
          <p>O organizador pode ajustar os dados. Quando republicar, você poderá aprovar ou rejeitar novamente no painel do time.</p>
          <p><a href="${painelUrl}" style="display: inline-block; padding: 12px 24px; background: #22C55E; color: #0C1222; text-decoration: none; font-weight: bold; border-radius: 8px;">Acessar painel do time</a></p>
          <p>Atenciosamente,<br/>Fly Games</p>
        </div>
      `;
      await sendEmailToMany(otherEmails, subject, html).catch((e) => console.error('[Sumula] Email outro rejeitou', e));
    }
  }

  return NextResponse.json({ ok: true });
}
