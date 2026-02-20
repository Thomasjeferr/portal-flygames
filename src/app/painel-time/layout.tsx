import { getSession } from '@/lib/auth';
import { ForceChangePasswordRedirect } from './ForceChangePasswordRedirect';

export default async function PainelTimeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const mustChangePassword = !!session?.mustChangePassword;

  return (
    <>
      {mustChangePassword && <ForceChangePasswordRedirect mustChangePassword={mustChangePassword} />}
      {children}
    </>
  );
}
