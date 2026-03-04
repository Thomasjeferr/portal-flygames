'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

function getMaintenanceViewCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes('x-maintenance-view=1');
}

interface Props {
  header: React.ReactNode;
  footer: React.ReactNode;
  footerLegal: React.ReactNode;
  initialMaintenanceView?: boolean;
  children: React.ReactNode;
}

/**
 * Em manutenção (rota /manutencao ou cookie x-maintenance-view): esconde menu e rodapé.
 * O cookie é setado pelo middleware quando reescreve "/" para /manutencao (URL continua "/").
 */
export function MaintenanceLayoutShell({ header, footer, footerLegal, initialMaintenanceView = false, children }: Props) {
  const pathname = usePathname();
  const [maintenanceFromCookie, setMaintenanceFromCookie] = useState(initialMaintenanceView);

  useEffect(() => {
    setMaintenanceFromCookie(getMaintenanceViewCookie());
  }, [pathname]);

  const isMaintenance = pathname === '/manutencao' || maintenanceFromCookie;

  if (isMaintenance) {
    return (
      <main className="min-h-screen flex flex-col">{children}</main>
    );
  }

  return (
    <>
      {header}
      <main className="min-h-screen">{children}</main>
      {footer}
    </>
  );
}
