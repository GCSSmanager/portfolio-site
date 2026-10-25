import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const base = '/crm/demo/pest/'

export default defineConfig(() => ({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_DEMO_MODE': JSON.stringify('true'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  base,
  build: {
    outDir: '../../_site/crm/demo/pest',
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5175,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 4175,
  },
}))
