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
          // Brand accents
          purple: '#4A1942',
          'purple-light': '#5C2254',
          'purple-dark': '#3A1333',
          gold: '#C9A96E',
          'gold-light': '#D4B882',
          'gold-dark': '#B8925A',
          // Light theme neutrals
          sand: '#F6F3EF',
          'sand-dark': '#EDE8E1',
          ink: '#1A1612',
          'ink-muted': '#7A7068',
          line: '#E4DFD8',
          // Legacy (kept for compat)
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
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-md': '0 4px 12px 0 rgb(0 0 0 / 0.07), 0 2px 4px -1px rgb(0 0 0 / 0.04)',
      },
    },
  },
  plugins: [],
}
