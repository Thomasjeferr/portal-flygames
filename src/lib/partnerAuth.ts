import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/** Retorna o parceiro aprovado vinculado ao usuário da sessão, ou null. */
export async function getApprovedPartner() {
  const session = await getSession();
  if (!session) return null;
  const partner = await prisma.partner.findFirst({
    where: { userId: session.userId, status: 'approved' },
    select: {
      id: true,
      name: true,
      refCode: true,
      planCommissionPercent: true,
      gameCommissionPercent: true,
      sponsorCommissionPercent: true,
      pixKey: true,
      pixKeyType: true,
    },
  });
  return partner;
}
