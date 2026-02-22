import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const statsItemSchema = z.object({
  teamMemberId: z.string().min(1),
  goals: z.number().int().min(0).default(0),
  assists: z.number().int().min(0).default(0),
  fouls: z.number().int().min(0).default(0),
  yellowCard: z.boolean().default(false),
  redCard: z.boolean().default(false),
  highlight: z.boolean().default(false),
});

const saveSumulaSchema = z.object({
  homeScore: z.number().int().min(0).optional().nullable(),
  awayScore: z.number().int().min(0).optional().nullable(),
  homeStats: z.array(statsItemSchema).optional().default([]),
  awayStats: z.array(statsItemSchema).optional().default([]),
});

/**
 * GET /api/admin/sumulas/games/[gameId]
 * Jogo com elencos (members) e stats atuais para o admin preencher a súmula.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const gameId = (await params).gameId;
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      homeTeam: {
        select: {
          id: true,
          name: true,
          shortName: true,
          crestUrl: true,
          members: { where: { isActive: true }, orderBy: { number: 'asc' }, select: { id: true, name: true, number: true, position: true, role: true } },
        },
      },
      awayTeam: {
        select: {
          id: true,
          name: true,
          shortName: true,
          crestUrl: true,
          members: { where: { isActive: true }, orderBy: { number: 'asc' }, select: { id: true, name: true, number: true, position: true, role: true } },
        },
      },
      playerMatchStats: { include: { teamMember: { select: { id: true, name: true, number: true } } } },
      sumulaApprovals: { select: { teamId: true, status: true, rejectionReason: true, rejectedAt: true, approvedAt: true } },
    },
  });

  if (!game) {
    return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });
  }

  const homeStats = game.playerMatchStats
    .filter((s) => s.teamId === game.homeTeamId)
    .map((s) => ({
      teamMemberId: s.teamMemberId,
      goals: s.goals,
      assists: s.assists,
      fouls: s.fouls,
      yellowCard: s.yellowCard,
      redCard: s.redCard,
      highlight: s.highlight,
    }));
  const awayStats = game.playerMatchStats
    .filter((s) => s.teamId === game.awayTeamId)
    .map((s) => ({
      teamMemberId: s.teamMemberId,
      goals: s.goals,
      assists: s.assists,
      fouls: s.fouls,
      yellowCard: s.yellowCard,
      redCard: s.redCard,
      highlight: s.highlight,
    }));

  return NextResponse.json({
    id: game.id,
    title: game.title,
    championship: game.championship,
    gameDate: game.gameDate.toISOString(),
    homeScore: game.homeScore,
    awayScore: game.awayScore,
    venue: game.venue,
    referee: game.referee,
    sumulaPublishedAt: game.sumulaPublishedAt?.toISOString() ?? null,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    homeStats,
    awayStats,
    sumulaApprovals: game.sumulaApprovals,
  });
}

/**
 * PATCH /api/admin/sumulas/games/[gameId]
 * Salva a súmula (placar + stats) e reseta aprovações para PENDENTE.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const gameId = (await params).gameId;
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, homeTeamId: true, awayTeamId: true },
  });
  if (!game) {
    return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });
  }
  if (!game.homeTeamId || !game.awayTeamId) {
    return NextResponse.json({ error: 'Jogo precisa ter mandante e visitante para preencher súmula' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = saveSumulaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    );
  }

  const { homeScore, awayScore, homeStats, awayStats } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.game.update({
      where: { id: gameId },
      data: {
        homeScore: homeScore ?? undefined,
        awayScore: awayScore ?? undefined,
        sumulaPublishedAt: new Date(),
      },
    });

    await tx.playerMatchStats.deleteMany({ where: { gameId } });

    const homeTeamId = game.homeTeamId!;
    const awayTeamId = game.awayTeamId!;

    for (const s of homeStats) {
      await tx.playerMatchStats.create({
        data: {
          gameId,
          teamId: homeTeamId,
          teamMemberId: s.teamMemberId,
          goals: s.goals,
          assists: s.assists,
          fouls: s.fouls,
          yellowCard: s.yellowCard,
          redCard: s.redCard,
          highlight: s.highlight,
        },
      });
    }
    for (const s of awayStats) {
      await tx.playerMatchStats.create({
        data: {
          gameId,
          teamId: awayTeamId,
          teamMemberId: s.teamMemberId,
          goals: s.goals,
          assists: s.assists,
          fouls: s.fouls,
          yellowCard: s.yellowCard,
          redCard: s.redCard,
          highlight: s.highlight,
        },
      });
    }

    await tx.gameSumulaApproval.upsert({
      where: { gameId_teamId: { gameId, teamId: homeTeamId } },
      create: { gameId, teamId: homeTeamId, status: 'PENDENTE' },
      update: { status: 'PENDENTE', rejectionReason: null, rejectedAt: null, approvedAt: null },
    });
    await tx.gameSumulaApproval.upsert({
      where: { gameId_teamId: { gameId, teamId: awayTeamId } },
      create: { gameId, teamId: awayTeamId, status: 'PENDENTE' },
      update: { status: 'PENDENTE', rejectionReason: null, rejectedAt: null, approvedAt: null },
    });
  });

  return NextResponse.json({ ok: true });
}
