import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { resolveSlotForResponsible } from '@/lib/pre-sale/resolve-slot-for-owner';

/**
 * Dados para montar o formulário de checkout sem código do clube.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const preSaleGameId = (await params).id;
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const resolved = await resolveSlotForResponsible(preSaleGameId, session.userId);
  if (!resolved.ok) {
    const status = resolved.code === 'NOT_OWNER' ? 403 : 400;
    return NextResponse.json({ error: resolved.error, code: resolved.code }, { status });
  }

  const [game, team, user] = await Promise.all([
    prisma.preSaleGame.findUnique({
      where: { id: preSaleGameId },
      select: {
        title: true,
        description: true,
        thumbnailUrl: true,
        clubAPrice: true,
        clubBPrice: true,
        maxSimultaneousPerClub: true,
        fundedClubsCount: true,
      },
    }),
    prisma.team.findUnique({
      where: { id: resolved.teamIdForSlot },
      select: { name: true, responsibleName: true, responsibleEmail: true },
    }),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { name: true, email: true },
    }),
  ]);

  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });

  const price = resolved.slotIndex === 1 ? game.clubAPrice : game.clubBPrice;
  const slotLabel = resolved.slotIndex === 1 ? 'Mandante' : 'Visitante';

  return NextResponse.json({
    slotId: resolved.slotId,
    slotIndex: resolved.slotIndex,
    slotLabel,
    price,
    maxSimultaneousPerClub: game.maxSimultaneousPerClub,
    fundedClubsCount: game.fundedClubsCount,
    game: {
      title: game.title,
      description: game.description,
      thumbnailUrl: game.thumbnailUrl,
    },
    prefill: {
      responsibleName: team?.responsibleName || user?.name || '',
      responsibleEmail: team?.responsibleEmail || user?.email || '',
      clubName: team?.name || '',
    },
  });
}
