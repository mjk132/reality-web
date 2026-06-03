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
        carbon: {
          DEFAULT: '#111111',
          900: '#0D0D0D',
          800: '#1A1A1A',
          700: '#252525',
          600: '#333333',
        },
        fire: {
          DEFAULT: '#FF6B00',
          500: '#FF6B00',
          400: '#FF8500',
          300: '#FFA500',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(255, 107, 0, 0.3), 0 0 40px rgba(255, 107, 0, 0.1)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(255, 107, 0, 0.6), 0 0 60px rgba(255, 107, 0, 0.2)',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
