import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** Retorna se a compra está paga e dados do jogo (para mensagem e redirecionamento no jogo avulso). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ purchaseId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const purchaseId = (await params).purchaseId;
  const purchase = await prisma.purchase.findFirst({
    where: { id: purchaseId, userId: session.userId },
    select: {
      paymentStatus: true,
      gameId: true,
      game: { select: { title: true, slug: true } },
      plan: { select: { type: true } },
    },
  });

  if (!purchase) {
    return NextResponse.json({ error: 'Compra não encontrada' }, { status: 404 });
  }

  const paid = purchase.paymentStatus === 'paid';
  const res: { paid: boolean; gameTitle?: string; gameSlug?: string } = { paid };

  if (paid && purchase.game) {
    res.gameTitle = purchase.game.title;
    res.gameSlug = purchase.game.slug;
  }

  return NextResponse.json(res);
}
