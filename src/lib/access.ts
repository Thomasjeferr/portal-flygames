import { prisma } from '@/lib/db';

/**
 * Indica se o usuário é responsável por algum time (gestão no painel).
 * Usado para bloquear compras com a conta de responsável.
 * Considera: (1) vínculo em TeamManager ou (2) e-mail igual a Team.responsibleEmail de time aprovado.
 */
export async function isTeamResponsible(userId: string): Promise<boolean> {
  const [managerCount, user] = await Promise.all([
    prisma.teamManager.count({ where: { userId } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    }),
  ]);
  if (managerCount > 0) return true;
  const email = user?.email?.trim().toLowerCase();
  if (!email) return false;
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Team"
    WHERE approval_status = 'approved'
      AND responsible_email IS NOT NULL
      AND LOWER(TRIM(responsible_email)) = ${email}
    LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * Indica se este usuário/e-mail já tem alguma compra no portal (assinatura, jogo avulso, patrocínio ou live).
 * Usado para bloquear cadastro de time como responsável: quem já comprou deve usar outro e-mail para ser responsável.
 */
export async function hasAnyPurchaseAsCustomer(userId: string, email: string): Promise<boolean> {
  const emailNorm = email?.trim().toLowerCase() ?? '';
  const [purchaseCount, sponsorCount, liveCount] = await Promise.all([
    prisma.purchase.count({
      where: { userId, paymentStatus: 'paid' },
    }),
    prisma.sponsorOrder.count({
      where: {
        paymentStatus: 'paid',
        OR: [{ userId }, ...(emailNorm ? [{ email: emailNorm }] : [])],
      },
    }),
    prisma.livePurchase.count({
      where: { userId, paymentStatus: 'paid' },
    }),
  ]);
  return purchaseCount > 0 || sponsorCount > 0 || liveCount > 0;
}

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
 * Pode ver a página de Resultados aprovados (súmulas oficiais)?
 * Sim se: assinatura ativa com acesso total OU tem pelo menos um SponsorOrder pago vinculado à conta (patrocinador empresa).
 */
export async function canAccessApprovedResults(userId: string): Promise<boolean> {
  if (await hasFullAccess(userId)) return true;

  const paidOrder = await prisma.sponsorOrder.findFirst({
    where: { userId, paymentStatus: 'paid' },
    select: { id: true },
  });
  return !!paidOrder;
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

/** Dados da live para checagem de acesso */
export type LiveAccessInput = {
  id: string;
  requireSubscription: boolean;
  allowOneTimePurchase: boolean;
};

/**
 * Verifica se o usuário pode assistir à live.
 * Retorna true se: não exige nada OU tem assinatura ativa (requireSubscription) OU comprou a live (allowOneTimePurchase).
 */
export async function canAccessLive(
  userId: string | null,
  live: LiveAccessInput
): Promise<boolean> {
  if (!userId) return false;
  if (!live.requireSubscription && !live.allowOneTimePurchase) return true;

  if (live.requireSubscription && (await hasFullAccess(userId))) return true;

  if (live.allowOneTimePurchase) {
    const purchase = await prisma.livePurchase.findUnique({
      where: {
        userId_liveId: { userId, liveId: live.id },
      },
    });
    if (purchase?.paymentStatus === 'paid') return true;
  }

  return false;
}

/**
 * Verifica acesso à live por id (recebe o registro completo do Prisma).
 */
export async function canAccessLiveById(userId: string | null, liveId: string): Promise<boolean> {
  if (!userId) return false;
  const live = await prisma.live.findUnique({
    where: { id: liveId },
    select: {
      requireSubscription: true,
      allowOneTimePurchase: true,
      id: true,
    },
  });
  if (!live) return false;
  return canAccessLive(userId, live);
}

/**
 * Retorna um mapa de acesso para vários jogos de uma vez.
 * Chaves do mapa são gameId e o valor indica se o usuário pode assistir.
 */
export async function getGamesAccessMap(
  userId: string | null,
  gameIds: string[],
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  const uniqueIds = Array.from(new Set(gameIds)).filter(Boolean);

  if (!uniqueIds.length) {
    return result;
  }

  if (!userId) {
    uniqueIds.forEach((id) => {
      result[id] = false;
    });
    return result;
  }

  if (await hasFullAccess(userId)) {
    uniqueIds.forEach((id) => {
      result[id] = true;
    });
    return result;
  }

  const purchases = await prisma.purchase.findMany({
    where: {
      userId,
      gameId: { in: uniqueIds },
      paymentStatus: 'paid',
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
    select: {
      gameId: true,
      plan: { select: { active: true } },
    },
  });

  const purchasedIds = new Set(
    purchases.filter((p) => p.plan?.active).map((p) => p.gameId),
  );

  uniqueIds.forEach((id) => {
    result[id] = purchasedIds.has(id);
  });

  return result;
}
