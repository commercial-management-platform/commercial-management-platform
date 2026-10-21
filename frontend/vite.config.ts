import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [svelte()],
    server: {
      // En desarrollo /api se redirige al backend NestJS: el navegador ve un solo
      // origen, así que no hay problemas de CORS ni de cookies entre puertos.
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})
