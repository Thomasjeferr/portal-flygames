import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.flygames.portal',
  appName: 'Fly Games',
  webDir: 'out',
  server: {
    // URL do site em produção. O app abre essa URL no WebView.
    // Para testar em dev, defina CAPACITOR_SERVER_URL no .env (ex.: https://seu-dominio.vercel.app)
    // Para build enviado às lojas (Play Store / App Store), use: https://flygames.app/?app=1
    // (modo "só login + assistir", sem planos/assinar no app). Ver docs/APP-LOJAS-LOGIN-ASSISTIR.md
    url: process.env.CAPACITOR_SERVER_URL || 'https://flygames.app',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
