import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy geoapi.pt to avoid CORS issues in the browser
      '/api/geoapi': {
        target: 'https://json.geoapi.pt',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/geoapi/, ''),
      },
    },
  },
})
