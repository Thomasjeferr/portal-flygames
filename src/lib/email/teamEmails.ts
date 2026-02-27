import { prisma } from '@/lib/db';

/**
 * Retorna os e-mails dos responsáveis pelo time (responsibleEmail + gestores do painel), sem duplicatas.
 */
export async function getTeamResponsibleEmails(teamId: string): Promise<string[]> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      responsibleEmail: true,
      managers: { include: { user: { select: { email: true } } } },
    },
  });
  if (!team) return [];
  const responsible = team.responsibleEmail?.trim().toLowerCase();
  const managerEmails = team.managers.map((m) => m.user.email).filter(Boolean) as string[];
  const set = new Set<string>([...(responsible ? [responsible] : []), ...managerEmails]);
  return Array.from(set);
}
