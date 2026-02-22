import { NextRequest, NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';
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

  return NextResponse.json({ ok: true });
}
