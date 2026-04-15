import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { audioProxyPlugin } from './vite-plugin-audio-proxy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), audioProxyPlugin()],
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
  },
  worker: {
    format: 'es',
  },
})
