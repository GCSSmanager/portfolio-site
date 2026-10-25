import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'
import { isCrmDataDir } from './crmDataDirs.ts'

const MIME: Record<string, string> = {
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.css': 'text/css',
  '.gif': 'image/gif',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.map': 'application/json',
  '.woff2': 'font/woff2',
}

function sendFile(res: import('http').ServerResponse, filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream')
  fs.createReadStream(filePath).pipe(res)
}

function trySendFile(
  res: import('http').ServerResponse,
  next: () => void,
  root: string,
  rel: string,
) {
  const filePath = path.join(root, rel)
  if (!filePath.startsWith(root)) {
    res.statusCode = 403
    res.end()
    return true
  }
  try {
    if (!fs.statSync(filePath).isFile()) {
      next()
      return true
    }
    sendFile(res, filePath)
    return true
  } catch {
    next()
    return true
  }
}

/** Dev-only: repo static before SPA fallback (vite-plugin-static-copy order breaks on Vite 8). */
export function repoStaticDev(repoRoot: string): Plugin {
  const mounts: Record<string, string> = {
    '/assets': path.join(repoRoot, 'assets'),
    '/css': path.join(repoRoot, 'css'),
    '/icons': path.join(repoRoot, 'icons'),
  }

  return {
    name: 'gcss-repo-static-dev',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] ?? ''

        if (url.startsWith('/data/')) {
          const rel = decodeURIComponent(url.slice('/data/'.length))
          const dir = rel.split('/')[0] ?? ''
          if (!isCrmDataDir(dir)) {
            next()
            return
          }
          const root = path.join(repoRoot, 'data', dir)
          if (trySendFile(res, next, root, rel.slice(dir.length + 1))) return
        }

        for (const [prefix, root] of Object.entries(mounts)) {
          if (!url.startsWith(`${prefix}/`) && url !== prefix) continue
          const rel = decodeURIComponent(url.slice(prefix.length).replace(/^\//, ''))
          if (trySendFile(res, next, root, rel)) return
        }

        if (url === '/styles-crm-shell.css' || url === '/favicon.ico') {
          const filePath = path.join(repoRoot, url.slice(1))
          try {
            if (fs.statSync(filePath).isFile()) {
              sendFile(res, filePath)
              return
            }
          } catch {
            /* fall through */
          }
        }

        if (url.startsWith('/crm/demo/')) {
          const siteRoot = path.join(repoRoot, '_site')
          const rel = decodeURIComponent(url.replace(/^\//, ''))
          let filePath = path.join(siteRoot, rel)
          try {
            const stat = fs.statSync(filePath)
            if (stat.isDirectory()) filePath = path.join(filePath, 'index.html')
            else if (!path.extname(filePath)) filePath = path.join(filePath, 'index.html')
            if (fs.statSync(filePath).isFile()) {
              sendFile(res, filePath)
              return
            }
          } catch {
            /* not built */
          }
          res.statusCode = 503
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(
            '<!doctype html><meta charset="utf-8"><title>Демо не собрано</title>' +
              '<p style="font-family:system-ui;padding:2rem">Демо CRM ещё не в <code>_site/crm/demo/</code>.</p>' +
              '<p style="font-family:system-ui;padding:0 2rem">Из корня репозитория: <code>npm run build</code> или перезапустите <code>npm run dev</code> (сборка подтянется автоматически).</p>',
          )
          return
        }

        next()
      })
    },
  }
}
