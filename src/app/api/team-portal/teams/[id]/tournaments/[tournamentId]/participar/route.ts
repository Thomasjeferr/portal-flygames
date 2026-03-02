import { NextRequest, NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';
import { sendTransactionalEmail, normalizeAppBaseUrl } from '@/lib/email/emailService';
import { getTeamResponsibleEmails } from '@/lib/email/teamEmails';
import { escapeHtml } from '@/lib/email/templateRenderer';

/**
 * POST /api/team-portal/teams/[id]/tournaments/[tournamentId]/participar
 * Inscreve o time no campeonato (cria TournamentTeam).
 * FREE → CONFIRMED; PAID → APPLIED (depois paga); GOAL → IN_GOAL.
 * Retorna needsPayment: true para PAID (front redireciona para checkout).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; tournamentId: string }> }
) {
  const { id: teamId, tournamentId } = await params;

  const hasAccess = await getTeamAccess(teamId);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Acesso negado a este time' }, { status: 403 });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, approvalStatus: true },
  });
  if (!team) {
    return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });
  }
  if (team.approvalStatus !== 'approved') {
    return NextResponse.json(
      { error: 'Apenas times aprovados podem se inscrever em campeonatos' },
      { status: 400 }
    );
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) {
    return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 });
  }
  if (tournament.status !== 'PUBLISHED') {
    return NextResponse.json(
      { error: 'Este campeonato não está com inscrições abertas' },
      { status: 400 }
    );
  }

  const existing = await prisma.tournamentTeam.findUnique({
    where: { tournamentId_teamId: { tournamentId, teamId } },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'Este time já está inscrito neste campeonato' },
      { status: 400 }
    );
  }

  const enrolledCount = await prisma.tournamentTeam.count({
    where: {
      tournamentId,
      teamStatus: { in: ['APPLIED', 'IN_GOAL', 'CONFIRMED'] },
    },
  });
  if (enrolledCount >= tournament.maxTeams) {
    return NextResponse.json(
      { error: 'As vagas deste campeonato já foram preenchidas' },
      { status: 400 }
    );
  }

  const mode = tournament.registrationMode;
  const teamStatus =
    mode === 'FREE' ? 'CONFIRMED' : mode === 'PAID' ? 'APPLIED' : 'IN_GOAL';
  const goalStatus = mode === 'GOAL' ? 'PENDING' : null;
  const goalPayoutPercent = 0;

  const created = await prisma.tournamentTeam.create({
    data: {
      tournamentId,
      teamId,
      registrationType: mode,
      teamStatus,
      goalStatus,
      goalPayoutPercent,
    },
    include: { tournament: true, team: true },
  });

  const needsPayment =
    mode === 'PAID' &&
    (tournament.registrationFeeAmount ?? 0) > 0;

  // E-mail automático com regulamento para os responsáveis do time (não bloqueia a resposta)
  const baseUrl = normalizeAppBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  const painelUrl = `${baseUrl}/painel-time/times/${teamId}/campeonatos`;

  let blocoRegulamentoUrl = '';
  if (tournament.regulamentoUrl?.trim()) {
    const url = tournament.regulamentoUrl.trim();
    blocoRegulamentoUrl = `<p style="margin-top:16px"><a href="${url}" style="display:inline-block;padding:12px 24px;background:#22c55e;color:#fff!important;text-decoration:none;border-radius:8px;font-weight:600">Acessar regulamento (link externo)</a></p>`;
  }

  let blocoRegulamentoTexto = '';
  if (tournament.regulamentoTexto?.trim()) {
    const textoEscapado = escapeHtml(tournament.regulamentoTexto.trim());
    blocoRegulamentoTexto = `<div style="margin-top:20px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0"><h3 style="margin-top:0;color:#0C1222;font-size:14px">Regulamento</h3><div style="white-space: pre-wrap;font-size:14px;line-height:1.5;color:#334155">${textoEscapado}</div></div>`;
  }

  const emails = await getTeamResponsibleEmails(teamId);
  const vars: Record<string, string> = {
    tournament_name: tournament.name,
    team_name: team.name,
    painel_url: painelUrl,
    bloco_regulamento_url: blocoRegulamentoUrl,
    bloco_regulamento_texto: blocoRegulamentoTexto,
  };
  for (const to of emails) {
    if (!to?.trim()) continue;
    sendTransactionalEmail({
      to: to.trim(),
      templateKey: 'TOURNAMENT_INSCRICAO_REGULAMENTO',
      vars,
    }).catch((e) => console.error('[participar] Erro ao enviar e-mail regulamento:', e));
  }

  return NextResponse.json({
    tournamentTeam: {
      id: created.id,
      teamStatus: created.teamStatus,
      paymentStatus: created.paymentStatus,
      registrationType: created.registrationType,
    },
    needsPayment,
    slug: tournament.slug,
    message: needsPayment
      ? 'Inscrição realizada. Realize o pagamento para confirmar.'
      : 'Inscrição realizada com sucesso.',
  });
}
