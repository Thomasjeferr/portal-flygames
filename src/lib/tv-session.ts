import { prisma } from '@/lib/db';

const TV_SESSION_HOURS = 24;

/**
 * Gera um deviceId estável para a sessão da TV (usado no limite de telas).
 */
export function generateTvDeviceId(): string {
  return `tv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Retorna userId e deviceId associados ao tvSessionToken válido, ou null se inválido/expirado.
 */
export async function getTvSessionByToken(
  token: string
): Promise<{ userId: string; deviceId: string } | null> {
  if (!token?.trim()) return null;
  const now = new Date();
  const session = await prisma.tvSession.findUnique({
    where: { token: token.trim() },
    select: { userId: true, deviceId: true, expiresAt: true },
  });
  if (!session || session.expiresAt < now) return null;
  return { userId: session.userId, deviceId: session.deviceId };
}

export { TV_SESSION_HOURS };
