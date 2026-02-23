import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ForceChangePasswordRedirect } from './ForceChangePasswordRedirect';

export default async function PainelTimeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/entrar?redirect=' + encodeURIComponent('/painel-time'));

  const mustChangePassword = !!session.mustChangePassword;
  const managedTeamsCount = await prisma.teamManager.count({ where: { userId: session.userId } });
  if (managedTeamsCount === 0) redirect('/');

  return (
    <>
      {mustChangePassword && <ForceChangePasswordRedirect mustChangePassword={mustChangePassword} />}
      {children}
    </>
  );
}
