import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const createTeamSchema = z.object({
  teamId: z.string().min(1, 'Time obrigatório'),
  registrationType: z.enum(['FREE', 'PAID', 'GOAL']),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const tournamentId = (await params).id;
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return NextResponse.json({ error: 'Torneio não encontrado' }, { status: 404 });

  const teams = await prisma.tournamentTeam.findMany({
    where: { tournamentId },
    include: { team: true },
    orderBy: [{ teamStatus: 'asc' }, { createdAt: 'desc' }],
  });
  return NextResponse.json({ teams });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const tournamentId = (await params).id;
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return NextResponse.json({ error: 'Torneio não encontrado' }, { status: 404 });

  const body = await request.json();
  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    );
  }

  const existing = await prisma.tournamentTeam.findUnique({
    where: { tournamentId_teamId: { tournamentId, teamId: parsed.data.teamId } },
  });
  if (existing) {
    return NextResponse.json({ error: 'Este time já está inscrito' }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: parsed.data.teamId } });
  if (!team) return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });

  const registrationType = parsed.data.registrationType;
  const teamStatus = tournament.registrationMode === 'GOAL' ? 'IN_GOAL' : 'APPLIED';
  const goalStatus = tournament.registrationMode === 'GOAL' ? 'PENDING' : null;

  const created = await prisma.tournamentTeam.create({
    data: {
      tournamentId,
      teamId: parsed.data.teamId,
      registrationType,
      teamStatus,
      goalStatus,
    },
    include: { team: true },
  });
  return NextResponse.json(created);
}
