import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateTeamStatusSchema = z.object({
  teamStatus: z.enum(['APPLIED', 'IN_GOAL', 'CONFIRMED', 'REJECTED', 'ELIMINATED']),
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
  const parsed = updateTeamStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Status inválido' },
      { status: 400 }
    );
  }

  const updated = await prisma.tournamentTeam.update({
    where: { tournamentId_teamId: { tournamentId, teamId } },
    data: { teamStatus: parsed.data.teamStatus },
    include: { team: true },
  });
  return NextResponse.json(updated);
}
