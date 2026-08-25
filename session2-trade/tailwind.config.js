/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: {
          950: '#040509',
          900: '#090b14',
          850: '#0f1220',
          800: '#15192c',
          700: '#1f253f',
          600: '#2e375a',
        },
        rarity: {
          common: '#94a3b8',
          rare: '#38bdf8',
          epic: '#c084fc',
          legendary: '#fbbf24',
          mythic: '#f43f5e',
          secret: '#ec4899',
        },
        dust: '#06b6d4',
        coin: '#f59e0b',
      },
      boxShadow: {
        'glow-rare': '0 0 25px rgba(56, 189, 248, 0.45)',
        'glow-epic': '0 0 35px rgba(192, 132, 252, 0.55)',
        'glow-legendary': '0 0 45px rgba(251, 191, 36, 0.7)',
        'glow-mythic': '0 0 55px rgba(244, 63, 94, 0.85)',
        'glow-secret': '0 0 65px rgba(236, 72, 153, 0.95)',
        'pack-hover': '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(168, 85, 247, 0.3)',
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
        'crack': 'crack 1s ease-in-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      }
    },
  },
  plugins: [],
}
