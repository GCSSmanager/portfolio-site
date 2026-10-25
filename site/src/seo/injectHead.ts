import { jsonLdScriptHtml } from './crmJsonLdGraph.ts'
import { DEFAULT_OG_IMAGE, type RouteSeo } from './routeMeta.ts'

function escapeAttr(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}

function escapeText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
}

export function buildHeadTags(seo: RouteSeo): string {
  const robots = seo.robots ?? 'index, follow'
  const title = escapeText(seo.title)
  const description = escapeAttr(seo.description)
  const canonical = escapeAttr(seo.canonical)

  return `    <title>${title}</title>
    <meta name="description" content="${description}" />
    <meta name="robots" content="${escapeAttr(robots)}" />
    <link rel="canonical" href="${canonical}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="ru_RU" />
    <meta property="og:site_name" content="ГКСС" />
    <meta property="og:title" content="${escapeAttr(seo.title)}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${escapeAttr(DEFAULT_OG_IMAGE)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeAttr(seo.title)}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${escapeAttr(DEFAULT_OG_IMAGE)}" />`
}

export type InjectSeoOptions = {
  /** Service schema for custom / free / integrations CRM landings. */
  jsonLdService?: boolean
  /** Omit JSON-LD (kp, 404). */
  jsonLd?: boolean
}

/** Вставляет SEO-теги в собранный index.html (статический хост / prerender). */
export function injectSeoIntoHtml(html: string, seo: RouteSeo, options: InjectSeoOptions = {}): string {
  const jsonLd = options.jsonLd !== false
  const includeService = options.jsonLdService === true

  const withoutOld = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta name="description"[\s\S]*?\/?>\s*/gi, '')
    .replace(/<meta name="robots"[\s\S]*?\/?>\s*/gi, '')
    .replace(/<link rel="canonical"[\s\S]*?\/?>\s*/gi, '')
    .replace(/<meta property="og:[^"]+"[\s\S]*?\/?>\s*/gi, '')
    .replace(/<meta name="twitter:[^"]+"[\s\S]*?\/?>\s*/gi, '')
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/gi, '')

  const jsonLdBlock = jsonLd ? `\n    ${jsonLdScriptHtml(seo, includeService)}` : ''
  return withoutOld.replace('</head>', `${buildHeadTags(seo)}${jsonLdBlock}\n  </head>`)
}
