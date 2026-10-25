import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { injectSeoIntoHtml } from '../src/seo/injectHead.ts'
import { crmRouteSeo, notFoundRouteSeo, routeSeoByPath } from '../src/seo/routeMeta.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(__dirname, '../../_site')
const indexHtml = path.join(outDir, 'index.html')

if (!fs.existsSync(indexHtml)) {
  console.error('[prerender] missing index.html in', outDir)
  process.exit(1)
}

const builtIndex = fs.readFileSync(indexHtml, 'utf8')

const routes = [
  '/crm/custom/',
  '/crm/free/',
  '/crm/integrations/',
  '/crm/about/',
  '/crm/kp/',
  '/legal/privacy/',
  '/legal/consent/',
  '/crm/',
] as const

const serviceRoutes = new Set(['/crm/custom/', '/crm/free/', '/crm/integrations/', '/crm/'])

function injectOptions(route: string) {
  if (route === '/crm/kp/') return { jsonLd: false as const }
  return { jsonLdService: serviceRoutes.has(route) }
}

for (const route of routes) {
  const seo = routeSeoByPath[route]
  if (!seo) continue
  const dir = path.join(outDir, route.replace(/^\//, ''))
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(
    path.join(dir, 'index.html'),
    injectSeoIntoHtml(builtIndex, seo, injectOptions(route)),
  )
}

fs.writeFileSync(
  path.join(outDir, 'index.html'),
  injectSeoIntoHtml(builtIndex, crmRouteSeo.custom, { jsonLdService: true }),
)
fs.writeFileSync(
  path.join(outDir, '404.html'),
  injectSeoIntoHtml(builtIndex, notFoundRouteSeo, { jsonLd: false }),
)

console.log('[prerender] wrote', routes.length + 2, 'html shells with route SEO')
