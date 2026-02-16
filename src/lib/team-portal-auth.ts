import { cookies } from 'next/headers';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const TEAM_PANEL_COOKIE = 'team_panel_token';

/** Retorna o id do time se o usuário tem acesso (sessão como manager ou cookie de token válido para esse time). */
export async function getTeamAccess(teamId: string): Promise<boolean> {
  const session = await getSession();
  if (session) {
    const mgr = await prisma.teamManager.findFirst({
      where: { teamId, userId: session.userId },
      select: { id: true },
    });
    if (mgr) return true;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(TEAM_PANEL_COOKIE)?.value;
  if (!token) return false;

  const team = await prisma.team.findFirst({
    where: {
      id: teamId,
      panelAccessToken: token,
      panelTokenExpiresAt: { gt: new Date() },
      approvalStatus: 'approved',
    },
    select: { id: true },
  });
  return !!team;
}

export { TEAM_PANEL_COOKIE };
