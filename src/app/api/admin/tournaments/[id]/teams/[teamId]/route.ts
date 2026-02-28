import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateTeamSchema = z.object({
  teamStatus: z.enum(['APPLIED', 'IN_GOAL', 'CONFIRMED', 'REJECTED', 'ELIMINATED']).optional(),
  goalPayoutPercent: z.number().int().min(0).max(100).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { id: tournamentId, teamId } = await params;
  const existing = await prisma.tournamentTeam.findFirst({
    where: { tournamentId, teamId },
  });
  if (!existing) return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 });

  const body = await request.json();
  const parsed = updateTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    );
  }

  const data: { teamStatus?: string; goalPayoutPercent?: number } = {};
  if (parsed.data.teamStatus !== undefined) data.teamStatus = parsed.data.teamStatus;
  if (parsed.data.goalPayoutPercent !== undefined)
    data.goalPayoutPercent = Math.min(100, Math.max(0, parsed.data.goalPayoutPercent));

  const updated = await prisma.tournamentTeam.update({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    data,
    include: { team: true },
  });
  return NextResponse.json(updated);
}

/** Remove a inscrição do time no torneio (excluir da lista). Remove também assinaturas de apoio deste time neste torneio. */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { id: tournamentId, teamId } = await params;
  const existing = await prisma.tournamentTeam.findFirst({
    where: { tournamentId, teamId },
  });
  if (!existing) return NextResponse.json({ error: 'Inscrição não encontrada' }, { status: 404 });

  await prisma.$transaction([
    prisma.tournamentSubscription.deleteMany({
      where: { tournamentId, teamSupportedId: teamId },
    }),
    prisma.tournamentTeam.delete({
      where: { tournamentId_teamId: { tournamentId, teamId } },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
