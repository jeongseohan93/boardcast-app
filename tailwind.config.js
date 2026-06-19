/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          outer: '#17191D',
          sidebar: '#1E2028',
          card: '#252830',
          input: '#1A1C23',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#8B8FA8',
          muted: '#4F5368',
        },
        accent: {
          mint: '#00FFA3',
          danger: '#F06060',
          warning: '#F0A060',
          success: '#31C27C',
          purple: '#A78BFA',
        },
        border: {
          DEFAULT: '#2E3041',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(40px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease forwards',
      },
    },
  },
  plugins: [],
}
