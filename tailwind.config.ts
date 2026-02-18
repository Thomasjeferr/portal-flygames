import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        futvar: {
          green: '#22C55E',
          'green-dark': '#16A34A',
          'green-light': '#4ADE80',
          field: '#15803D',
          gold: '#F59E0B',
          'gold-light': '#FBBF24',
          dark: '#0C1222',
          darker: '#070D18',
          gray: '#1E293B',
          light: '#94A3B8',
          white: '#F8FAFC',
        },
        netflix: {
          red: '#E50914',
          black: '#0C1222',
          dark: '#0f172a',
          gray: '#1E293B',
          light: '#94A3B8',
        },
      },
      fontFamily: {
        // Pilha “estilo Apple”: San Francisco no Mac/iOS, Segoe UI no Windows, Roboto no Android
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'Oxygen', 'Ubuntu', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-pattern': 'linear-gradient(135deg, rgba(22,163,74,0.15) 0%, transparent 50%, rgba(245,158,11,0.08) 100%)',
        'grass-gradient': 'linear-gradient(180deg, transparent 0%, rgba(22,163,74,0.03) 50%, rgba(22,163,74,0.08) 100%)',
      },
      boxShadow: {
        'card': '0 4px 20px -4px rgba(0,0,0,0.4)',
        'card-hover': '0 12px 40px -8px rgba(34,197,94,0.2)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.6s ease-out both',
        'fade-in': 'fade-in 0.5s ease-out both',
        'slide-down': 'slide-down 0.5s ease-out both',
        'scale-in': 'scale-in 0.4s ease-out both',
      },
      animationDelay: {
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '350': '350ms',
        '400': '400ms',
      },
    },
  },
  plugins: [],
};

export default config;
