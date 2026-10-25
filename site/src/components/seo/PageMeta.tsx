import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { seoForPathname } from '@/seo/routeMeta'

type PageMetaProps = {
  title?: string
  description?: string
  canonical?: string
  robots?: string
  bodyClass?: string
  crmSolution?: string
}

function upsertMeta(name: string, content: string, property = false) {
  const attr = property ? 'property' : 'name'
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.content = content
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    document.head.appendChild(el)
  }
  el.href = href
}

export function PageMeta({
  title: titleProp,
  description: descriptionProp,
  canonical: canonicalProp,
  robots: robotsProp,
  bodyClass,
  crmSolution,
}: PageMetaProps) {
  const { pathname } = useLocation()
  const fromRoute = seoForPathname(pathname)

  const title = titleProp ?? fromRoute?.title ?? document.title
  const description = descriptionProp ?? fromRoute?.description ?? ''
  const canonical = canonicalProp ?? fromRoute?.canonical
  const robots = robotsProp ?? fromRoute?.robots ?? 'index, follow'

  const ogImage = 'https://gcss-portfolio.ru/assets/crm-hero.webp'

  useEffect(() => {
    document.title = title
    if (description) upsertMeta('description', description)
    upsertMeta('robots', robots)
    if (canonical) upsertLink('canonical', canonical)

    upsertMeta('og:type', 'website', true)
    upsertMeta('og:locale', 'ru_RU', true)
    upsertMeta('og:site_name', 'ГКСС', true)
    upsertMeta('og:title', title, true)
    upsertMeta('og:description', description, true)
    if (canonical) upsertMeta('og:url', canonical, true)
    upsertMeta('og:image', ogImage, true)
    upsertMeta('twitter:card', 'summary_large_image')
    upsertMeta('twitter:title', title)
    upsertMeta('twitter:description', description)
    upsertMeta('twitter:image', ogImage)

    const prevClass = document.body.className
    document.body.className =
      bodyClass ?? (crmSolution ? `crm-page crm-page--${crmSolution}` : prevClass)

    return () => {
      document.body.className = prevClass
    }
  }, [title, description, canonical, robots, bodyClass, crmSolution, ogImage])

  return null
}
