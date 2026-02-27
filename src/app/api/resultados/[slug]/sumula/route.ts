import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug;
  if (!slug) {
    return NextResponse.json({ error: 'Slug obrigatório' }, { status: 400 });
  }

  try {
    const game = await prisma.game.findUnique({
      where: { slug },
      include: {
        homeTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
        awayTeam: { select: { id: true, name: true, shortName: true, crestUrl: true } },
        sumulaApprovals: { select: { status: true } },
        playerMatchStats: {
          include: {
            teamMember: { select: { id: true, name: true, number: true, photoUrl: true } },
          },
        },
      },
    });

    if (!game || game.sumulaPublishedAt == null) {
      return NextResponse.json({ error: 'Jogo não encontrado ou súmula não publicada' }, { status: 404 });
    }

    const bothApproved =
      game.sumulaApprovals.length === 2 &&
      game.sumulaApprovals.every((a) => a.status === 'APROVADA');
    if (!bothApproved) {
      return NextResponse.json({ error: 'Súmula não aprovada' }, { status: 404 });
    }

    const homeStats = game.playerMatchStats
      .filter((s) => s.teamId === game.homeTeamId)
      .map((s) => ({
        id: s.teamMember.id,
        name: s.teamMember.name,
        photoUrl: s.teamMember.photoUrl ?? null,
        goals: s.goals,
        assists: s.assists,
        yellow: s.yellowCard,
        red: s.redCard,
      }));

    const awayStats = game.playerMatchStats
      .filter((s) => s.teamId === game.awayTeamId)
      .map((s) => ({
        id: s.teamMember.id,
        name: s.teamMember.name,
        photoUrl: s.teamMember.photoUrl ?? null,
        goals: s.goals,
        assists: s.assists,
        yellow: s.yellowCard,
        red: s.redCard,
      }));

    return NextResponse.json({
      id: game.id,
      slug: game.slug,
      title: game.title,
      homeTeam: game.homeTeam
        ? {
            name: game.homeTeam.name,
            shortName: game.homeTeam.shortName,
            crestUrl: game.homeTeam.crestUrl,
          }
        : null,
      awayTeam: game.awayTeam
        ? {
            name: game.awayTeam.name,
            shortName: game.awayTeam.shortName,
            crestUrl: game.awayTeam.crestUrl,
          }
        : null,
      score: { home: game.homeScore ?? 0, away: game.awayScore ?? 0 },
      competitionName: game.championship,
      date: game.gameDate.toISOString(),
      stats: { home: homeStats, away: awayStats },
    });
  } catch (e) {
    console.error('GET /api/resultados/[slug]/sumula', e);
    return NextResponse.json({ error: 'Erro ao carregar súmula' }, { status: 500 });
  }
}
