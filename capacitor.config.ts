import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.flygames.portal',
  appName: 'Fly Games',
  webDir: 'out',
  server: {
    // URL do site em produção. O app abre essa URL no WebView.
    // Para testar em dev, defina CAPACITOR_SERVER_URL no .env (ex.: https://seu-dominio.vercel.app)
    url: process.env.CAPACITOR_SERVER_URL || 'https://portal.futvar.com.br',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
