import { prisma } from '@/lib/db';

/**
 * Verifica se o usuário pode assistir a qualquer jogo (assinatura ativa com acesso total).
 */
export async function hasFullAccess(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });
  if (!sub?.active || sub.endDate < new Date()) return false;
  if (!sub.plan) return true; // assinatura legada sem plano = acesso total
  return sub.plan.acessoTotal;
}

/**
 * Verifica se o usuário pode assistir a um jogo específico.
 * Retorna true se: tem assinatura ativa com acesso total OU comprou o jogo (plano unitário pago e não expirado).
 */
export async function canAccessGame(userId: string, gameId: string): Promise<boolean> {
  if (await hasFullAccess(userId)) return true;

  const purchase = await prisma.purchase.findFirst({
    where: {
      userId,
      gameId,
      paymentStatus: 'paid',
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
    include: { plan: true },
  });
  return !!purchase?.plan?.active;
}

/**
 * Verifica se o usuário pode assistir ao jogo pelo slug.
 */
export async function canAccessGameBySlug(userId: string, gameSlug: string): Promise<boolean> {
  const game = await prisma.game.findUnique({ where: { slug: gameSlug }, select: { id: true } });
  if (!game) return false;
  return canAccessGame(userId, game.id);
}
