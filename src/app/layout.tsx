import type { Metadata } from 'next';
import { Bebas_Neue } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { VisitTracker } from '@/components/VisitTracker';
import { AnalyticsScripts } from '@/components/AnalyticsScripts';

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'Fly Games - Futebol de Várzea Filmado com Drones',
  description: 'Assista aos jogos de futebol de várzea filmados com drones. Visão aérea de cada lance, em campo e na replay.',
  icons: { icon: '/uploads/favicon-fly.png' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={bebas.variable}>
      <body className="font-sans antialiased">
        <VisitTracker />
        <AnalyticsScripts />
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
