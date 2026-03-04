import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.flygames.portal',
  appName: 'Fly Games',
  webDir: 'out',
  server: {
    // URL do site em produção. O app abre essa URL no WebView.
    // ?app=1 = modo lojas: esconde planos, assinar, criar conta e preços (revisores não veem compras).
    // Para testar com site completo (com planos), use CAPACITOR_SERVER_URL=https://flygames.app no .env.
    url: process.env.CAPACITOR_SERVER_URL || 'https://flygames.app/?app=1',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
