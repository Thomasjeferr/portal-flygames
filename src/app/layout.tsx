import type { Metadata } from 'next';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { Bebas_Neue } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { FooterLegalOnly } from '@/components/FooterLegalOnly';
import { MaintenanceLayoutShell } from '@/components/MaintenanceLayoutShell';
import { VisitTracker } from '@/components/VisitTracker';
import { AnalyticsScripts } from '@/components/AnalyticsScripts';
import { StoreAppProvider } from '@/lib/StoreAppContext';

export const dynamic = 'force-dynamic';

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Fly Games - Futebol de Várzea Filmado com Drones',
  description: 'Assista aos jogos de futebol de várzea filmados com drones. Visão aérea de cada lance, em campo e na replay.',
  icons: { icon: '/uploads/favicon-fly.png' },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Fly Games',
    statusBarStyle: 'default',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const initialMaintenanceView = cookieStore.get('x-maintenance-view')?.value === '1';

  return (
    <html lang="pt-BR" className={bebas.variable}>
      <body className="font-sans antialiased">
        <VisitTracker />
        <AnalyticsScripts />
        <Suspense fallback={null}>
          <StoreAppProvider>
            <MaintenanceLayoutShell
              header={<Header />}
              footer={<Footer />}
              footerLegal={<FooterLegalOnly />}
              initialMaintenanceView={initialMaintenanceView}
            >
              {children}
            </MaintenanceLayoutShell>
          </StoreAppProvider>
        </Suspense>
      </body>
    </html>
  );
}
