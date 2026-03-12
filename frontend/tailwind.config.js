/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        dark: '#1F2937',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-in-out',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'pulse-ring': 'pulseRing 2s infinite',
      },
      keyframes: {
        slideIn: {
          'from': {
            transform: 'translateX(100%)',
            opacity: '0',
          },
          'to': {
            transform: 'translateX(0)',
            opacity: '1',
          },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        pulseRing: {
          '0%': {
            boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.7)',
          },
          '50%': {
            boxShadow: '0 0 0 10px rgba(59, 130, 246, 0)',
          },
          '100%': {
            boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)',
          },
        },
      },
    },
  },
  plugins: [],
}
