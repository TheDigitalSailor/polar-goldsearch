/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        polar: {
          purple: '#4A1942',
          'purple-light': '#5C2254',
          'purple-dark': '#3A1333',
          gold: '#C9A96E',
          'gold-light': '#D4B882',
          'gold-dark': '#B8925A',
          cream: '#F5F0E8',
          'cream-muted': '#E8E1D4',
        },
        verdict: {
          pass: '#EF4444',
          grey: '#F59E0B',
          investigate: '#10B981',
          excellent: '#6366F1',
        }
      },
      fontFamily: {
        display: ['Masconia', 'Cormorant Garamond', 'Georgia', 'serif'],
        body: ['Cabinet Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
