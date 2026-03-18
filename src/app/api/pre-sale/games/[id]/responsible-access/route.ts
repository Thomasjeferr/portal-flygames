import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isTeamOwner } from '@/lib/access';

/**
 * Indica se o usuário logado pode acessar o checkout desta pré-estreia clubes
 * (é responsável pelo mandante ou pelo visitante).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const game = await prisma.preSaleGame.findUnique({
    where: { id },
    select: { id: true, slug: true, homeTeamId: true, awayTeamId: true, clubSlots: { select: { id: true, slotIndex: true, paymentStatus: true } } },
  });
  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });

  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({
      loggedIn: false,
      canAccessCheckout: false,
    });
  }

  // Se for club_viewer (membro com usuário/senha da pré-estreia), verificar se tem slot deste jogo → redirecionar para o player
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });
  let clubViewerHasAccess = false;
  if (user?.role === 'club_viewer' && game.slug) {
    const slot = await prisma.preSaleClubSlot.findFirst({
      where: {
        preSaleGameId: id,
        clubViewerAccount: { userId: session.userId },
      },
      select: { id: true },
    });
    clubViewerHasAccess = !!slot;
  }

  const [ownerHome, ownerAway] = await Promise.all([
    game.homeTeamId ? isTeamOwner(session.userId, game.homeTeamId) : Promise.resolve(false),
    game.awayTeamId ? isTeamOwner(session.userId, game.awayTeamId) : Promise.resolve(false),
  ]);
  const canAccessCheckout = ownerHome || ownerAway;

  // Verifica se o slot do time DESTE responsável já está pago (slot 1 = mandante, 2 = visitante)
  let slotAlreadyPaid = false;
  if (canAccessCheckout && game.clubSlots.length > 0) {
    const slotHome = game.clubSlots.find((s) => s.slotIndex === 1);
    const slotAway = game.clubSlots.find((s) => s.slotIndex === 2);
    const homePaid = slotHome?.paymentStatus === 'PAID';
    const awayPaid = slotAway?.paymentStatus === 'PAID';
    slotAlreadyPaid = (ownerHome && homePaid) || (ownerAway && awayPaid);
  }

  return NextResponse.json({
    loggedIn: true,
    canAccessCheckout,
    isOwnerHome: ownerHome,
    isOwnerAway: ownerAway,
    slotAlreadyPaid,
    clubViewerHasAccess: user?.role === 'club_viewer' ? clubViewerHasAccess : false,
    gameSlug: clubViewerHasAccess ? game.slug : undefined,
  });
}
