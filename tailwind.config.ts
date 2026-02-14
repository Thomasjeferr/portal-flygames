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
        sans: ['var(--font-netflix)', 'system-ui', 'sans-serif'],
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
    },
  },
  plugins: [],
};

export default config;
