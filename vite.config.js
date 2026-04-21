import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga las variables de entorno (incluye .env.local si existe)
  const env = loadEnv(mode, process.cwd(), '')

  // Si VITE_API_TARGET está definido (ej: en .env.local) lo usamos,
  // si no, usamos el backend local de desarrollo.
  const apiTarget = env.VITE_API_TARGET || 'https://localhost:7156'
  const isRemote = apiTarget.includes('onrender.com') || apiTarget.startsWith('https://')

  console.log(`\n🎯 Proxy target: ${apiTarget}\n`)

  return {
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
          target: apiTarget,
          changeOrigin: true,
          secure: isRemote, // false solo para certs autofirmados de localhost
        },
        '/hubs': {
          target: apiTarget,
          changeOrigin: true,
          secure: isRemote,
          ws: true, // WebSocket para SignalR
        },
      },
    },
  }
})

