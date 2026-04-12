import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://localhost:7156',
        changeOrigin: true,
        secure: false, // Ignorar certificado autofirmado de desarrollo
      },
      '/hubs': {
        target: 'https://localhost:7156',
        changeOrigin: true,
        secure: false,
        ws: true, // WebSocket para SignalR
      },
    },
  },
})
