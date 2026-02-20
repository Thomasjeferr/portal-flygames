import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** Retorna true se o usuário logado tem acesso ao time (TeamManager). Acesso apenas por login. */
export async function getTeamAccess(teamId: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  const mgr = await prisma.teamManager.findFirst({
    where: { teamId, userId: session.userId },
    select: { id: true },
  });
  return !!mgr;
}
