import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga las variables de entorno (incluye .env.local si existe)
  const env = loadEnv(mode, process.cwd(), '')

  // Render en dev si VITE_API_TARGET está en .env.development / .env.local
  const apiTarget = env.VITE_API_TARGET || 'https://sporttrack-sigdef.onrender.com'
  const isRemote = apiTarget.includes('onrender.com') || (apiTarget.startsWith('https://') && !apiTarget.includes('localhost'))

  console.log(`\n🎯 Proxy target: ${apiTarget}\n`)

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5174,
      strictPort: true,
      host: true, // Expone la IP de red local para acceso desde móvil/otros dispositivos
      allowedHosts: true, // Permite túneles externos (Cloudflare, ngrok, etc.)
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

