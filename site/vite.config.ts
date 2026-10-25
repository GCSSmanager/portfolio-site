import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { CRM_DATA_DIRS } from './vite/crmDataDirs.ts'
import { preserveCrmDemos } from './vite/preserveDemos.ts'
import { repoStaticDev } from './vite/repoStatic.ts'

const repoRoot = path.resolve(import.meta.dirname, '..')
const outDir = path.resolve(repoRoot, '_site')

export default defineConfig(() => ({
  plugins: [
    react(),
    preserveCrmDemos(outDir),
    repoStaticDev(repoRoot),
    viteStaticCopy({
      targets: [
        { src: '../assets/**/*', dest: 'assets' },
        { src: '../css/**/*', dest: 'css' },
        ...CRM_DATA_DIRS.map((dir) => ({
          src: `../data/${dir}/**/*`,
          dest: `data/${dir}`,
        })),
        { src: '../icons/**/*', dest: 'icons' },
        { src: '../favicon.ico', dest: '.' },
        { src: '../styles-crm-shell.css', dest: '.' },
        { src: '../CNAME', dest: '.' },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  base: '/',
  build: {
    outDir,
    emptyOutDir: false,
    assetsDir: '_vite',
    chunkSizeWarningLimit: 900,
  },
  server: {
    host: true,
    port: 8081,
    fs: {
      allow: [repoRoot],
    },
  },
  preview: {
    host: true,
    port: 8080,
  },
}))
