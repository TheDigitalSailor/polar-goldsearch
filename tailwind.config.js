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
          gold: '#C9A96E',
          'gold-light': '#D4B882',
          // Light theme neutrals
          sand: '#F6F3EF',
          'sand-dark': '#EDE8E1',
          ink: '#1A1612',
          'ink-muted': '#7A7068',
          line: '#E4DFD8',
        },
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
