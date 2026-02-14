import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { AdminShell } from '@/components/admin/AdminShell';

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect('/admin/entrar');
  if (session.role !== 'admin') redirect('/');
  return <AdminShell>{children}</AdminShell>;
}
