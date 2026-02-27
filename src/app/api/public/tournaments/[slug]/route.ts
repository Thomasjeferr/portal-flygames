import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/public/tournaments/[slug]
 * Retorna dados públicos do torneio (apenas status PUBLISHED) para a página pública.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const slug = (await params).slug;
  if (!slug) {
    return NextResponse.json({ error: 'Slug obrigatório' }, { status: 400 });
  }

  const tournament = await prisma.tournament.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: {
      id: true,
      name: true,
      slug: true,
      season: true,
      maxTeams: true,
      registrationMode: true,
      goalRequiredSupporters: true,
      goalPricePerSupporter: true,
      teams: {
        select: {
          teamId: true,
          teamStatus: true,
          registrationType: true,
          goalCurrentSupporters: true,
          team: { select: { id: true, name: true, shortName: true, crestUrl: true } },
        },
      },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: 'Torneio não encontrado' }, { status: 404 });
  }

  return NextResponse.json(tournament);
}
