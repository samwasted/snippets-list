import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [ tailwindcss(), react()],
    server: {
    proxy: {
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,            // ← must be a WebSocket target
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
