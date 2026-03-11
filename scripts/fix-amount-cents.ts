/**
 * Script único: corrige amountCents em Subscription e Purchase para o valor realmente pago.
 * Usa SQL direto para não depender do Prisma Client estar regenerado (amount_cents).
 *
 * Uso (PowerShell):
 *   $env:FIX_USER_EMAIL="kryptoinvestimentos@gmail.com"; npx tsx scripts/fix-amount-cents.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USER_EMAIL = process.env.FIX_USER_EMAIL ?? 'kryptoinvestimentos@gmail.com';
const SUBSCRIPTION_CENTS = parseInt(process.env.SUBSCRIPTION_CENTS ?? '503', 10); // R$ 5,03
const PURCHASE_TORCEDOR_CENTS = parseInt(process.env.PURCHASE_TORCEDOR_CENTS ?? '503', 10);
const PURCHASE_1JOGO_CENTS = parseInt(process.env.PURCHASE_1JOGO_CENTS ?? '500', 10);

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: { equals: USER_EMAIL, mode: 'insensitive' } },
    select: { id: true, email: true },
  });
  if (!user) {
    console.error('Usuário não encontrado:', USER_EMAIL);
    process.exit(1);
  }
  console.log('Usuário:', user.email, user.id);

  // Atualizar Subscription via SQL (evita erro se o Prisma Client não tiver amount_cents)
  const subResult = await prisma.$executeRaw`
    UPDATE "Subscription" SET amount_cents = ${SUBSCRIPTION_CENTS} WHERE user_id = ${user.id}
  `;
  if (subResult > 0) {
    console.log('Subscription atualizada ->', SUBSCRIPTION_CENTS, 'centavos (R$', (SUBSCRIPTION_CENTS / 100).toFixed(2) + ')');
  } else {
    console.log('Sem assinatura para este usuário.');
  }

  // Buscar compras pagas com plano
  const purchases = await prisma.purchase.findMany({
    where: { userId: user.id, paymentStatus: 'paid' },
    include: { plan: { select: { name: true, type: true } }, game: { select: { id: true } } },
    orderBy: { purchasedAt: 'desc' },
  });

  for (const p of purchases) {
    const isRecorrente = p.plan.type === 'recorrente' || /torcedor/i.test(p.plan.name);
    const is1Jogo = !!p.gameId || /1 jogo|patrocinar 1 jogo/i.test(p.plan.name);
    const newCents = isRecorrente ? PURCHASE_TORCEDOR_CENTS : is1Jogo ? PURCHASE_1JOGO_CENTS : null;
    if (newCents != null) {
      await prisma.$executeRaw`UPDATE "Purchase" SET amount_cents = ${newCents} WHERE id = ${p.id}`;
      console.log('Purchase:', p.plan.name, '->', newCents, 'centavos');
    }
  }

  console.log('Concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
