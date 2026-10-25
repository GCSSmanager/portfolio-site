import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { repoStaticDev } from './vite/repoStatic'

const repoRoot = path.resolve(import.meta.dirname, '..')

const CRM_DATA_DIRS = [
  'flower-crm',
  'clinic-crm',
  'pest-crm',
  'motorlab-crm',
  'severkuhnya-crm',
  'sila-crm',
] as const

export default defineConfig(() => ({
  plugins: [
    react(),
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
    outDir: path.resolve(repoRoot, '_site'),
    emptyOutDir: true,
    /** Do not collide with /assets/*.webp from repo root */
    assetsDir: '_vite',
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
