import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

const INTERNAL_EMAIL_DOMAIN = 'gamecontract.interno.portal';

function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function makeInternalEmail(gameId: string, side: string): string {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `gc-${gameId.slice(0, 8)}-${side}-${suffix}@${INTERNAL_EMAIL_DOMAIN}`;
}

export type GameContractSide = 'home' | 'away';

/**
 * Gera ou reativa credencial de contrato para mandante ou visitante.
 * Só funciona se o jogo tiver contractCredentialsEnabled e o time do lado estiver definido.
 */
export async function generateGameContractCredential(
  gameId: string,
  side: GameContractSide,
  maxConcurrentStreams: number
): Promise<{ ok: true; username: string; password: string } | { ok: false; error: string }> {
  const maxScreens = Math.max(1, Math.min(500, Math.floor(maxConcurrentStreams)));

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: {
      contractCredentialsEnabled: true,
      homeTeamId: true,
      awayTeamId: true,
    },
  });
  if (!game) return { ok: false, error: 'Jogo não encontrado' };
  if (!game.contractCredentialsEnabled) {
    return {
      ok: false,
      error: 'Ative "Acesso por contrato (credenciais por time)" neste jogo antes de gerar credenciais.',
    };
  }
  if (side === 'home' && !game.homeTeamId) {
    return { ok: false, error: 'Defina o time mandante no cadastro do jogo.' };
  }
  if (side === 'away' && !game.awayTeamId) {
    return { ok: false, error: 'Defina o time visitante no cadastro do jogo.' };
  }

  const existing = await prisma.gameTeamCredential.findUnique({
    where: { gameId_side: { gameId, side } },
    include: { user: { select: { id: true, email: true } } },
  });

  if (existing?.active && !existing.revokedAt) {
    return {
      ok: false,
      error: 'Já existe credencial ativa para este lado. Use "Regenerar senha" ou "Revogar" antes.',
    };
  }

  const password = generatePassword(12);
  const passwordHash = await hashPassword(password);

  if (existing) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.userId },
        data: { passwordHash, emailVerified: true },
      }),
      prisma.gameTeamCredential.update({
        where: { id: existing.id },
        data: {
          maxConcurrentStreams: maxScreens,
          active: true,
          revokedAt: null,
          credentialsSentAt: new Date(),
        },
      }),
    ]);
    return { ok: true, username: existing.user.email, password };
  }

  const email = makeInternalEmail(gameId, side);
  const user = await prisma.user.create({
    data: {
      email,
      name: side === 'home' ? 'Contrato mandante' : 'Contrato visitante',
      passwordHash,
      role: 'game_contract_viewer',
      emailVerified: true,
    },
  });

  await prisma.gameTeamCredential.create({
    data: {
      gameId,
      side,
      userId: user.id,
      maxConcurrentStreams: maxScreens,
      active: true,
      credentialsSentAt: new Date(),
    },
  });

  return { ok: true, username: email, password };
}

export async function regenerateGameContractPassword(
  gameId: string,
  side: GameContractSide
): Promise<{ ok: true; username: string; password: string } | { ok: false; error: string }> {
  const row = await prisma.gameTeamCredential.findUnique({
    where: { gameId_side: { gameId, side } },
    include: { user: true },
  });
  if (!row) return { ok: false, error: 'Não há credencial para este lado. Gere primeiro.' };
  if (!row.active || row.revokedAt) {
    return { ok: false, error: 'Credencial revogada ou inativa. Gere novamente.' };
  }

  const password = generatePassword(12);
  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash },
  });

  return { ok: true, username: row.user.email, password };
}

export async function revokeGameContractCredential(
  gameId: string,
  side: GameContractSide
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await prisma.gameTeamCredential.findUnique({
    where: { gameId_side: { gameId, side } },
  });
  if (!row) return { ok: false, error: 'Não há credencial para este lado.' };

  await prisma.gameTeamCredential.update({
    where: { id: row.id },
    data: { active: false, revokedAt: new Date() },
  });
  return { ok: true };
}

export async function updateGameContractMaxStreams(
  gameId: string,
  side: GameContractSide,
  maxConcurrentStreams: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const maxScreens = Math.max(1, Math.min(500, Math.floor(maxConcurrentStreams)));
  const row = await prisma.gameTeamCredential.findUnique({
    where: { gameId_side: { gameId, side } },
  });
  if (!row) return { ok: false, error: 'Não há credencial para este lado.' };

  await prisma.gameTeamCredential.update({
    where: { id: row.id },
    data: { maxConcurrentStreams: maxScreens },
  });
  return { ok: true };
}
