import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiTarget = process.env.VITE_API_PROXY ?? 'http://127.0.0.1:8471'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 4317,
    host: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  preview: {
    port: 4317,
    host: true,
  },
})
