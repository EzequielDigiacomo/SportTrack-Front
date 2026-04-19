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
    host: true, // Expone la IP de red local para acceso desde móvil/otros dispositivos
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
