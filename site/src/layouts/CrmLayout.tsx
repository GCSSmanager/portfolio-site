import { Outlet, useLocation } from 'react-router-dom'
import { useScrollToTopOnNavigate } from '@/hooks/useScrollToTopOnNavigate'
import { CookieBanner } from '@/components/crm/CookieBanner'
import { CrmAssistant } from '@/components/crm/CrmAssistant'
import { CrmNav } from '@/components/crm/CrmNav'
import { CrmTotop } from '@/components/crm/CrmTotop'
import { SiteFooter } from '@/components/site/SiteFooter'
import { CrmUiProvider } from '@/context/CrmUiProvider'
import { crmPageConfig, type CrmPageId } from '@/crm/pageConfig'
import { crmPages } from '@/crm/meta'
import type { CrmPageMeta } from '@/types/crm'

export type CrmLayoutContext = CrmPageMeta

const metaByPath: Record<string, CrmPageMeta> = {
  '/crm/custom/': crmPages.custom,
  '/crm/free/': crmPages.free,
  '/crm/integrations/': crmPages.integrations,
  '/crm/bitrix/': crmPages.bitrix,
  '/crm/about/': crmPages.about,
}

const pageIdByPath: Record<string, CrmPageId> = {
  '/crm/custom/': 'custom',
  '/crm/free/': 'free',
  '/crm/integrations/': 'integrations',
  '/crm/bitrix/': 'bitrix',
  '/crm/about/': 'about',
}

export function CrmLayout() {
  const { pathname } = useLocation()
  useScrollToTopOnNavigate()
  const meta = metaByPath[pathname] ?? crmPages.custom
  const brandHref = meta.brandHref ?? `/crm/${meta.solution}/`
  const pageId = pageIdByPath[pathname]
  const sections = pageId ? crmPageConfig[pageId].sections : []
  const priceSection = sections.includes('pricing') ? 'pricing' : 'examples'
  const pricesBeforeReviews = sections.indexOf(priceSection) < sections.indexOf('reviews')

  return (
    <CrmUiProvider>
      <CrmNav
        brandHref={brandHref}
        showMenu={pageId !== 'about'}
        showReviews={sections.includes('reviews')}
        showPrices={sections.includes('examples') || sections.includes('pricing')}
        pricesHref={sections.includes('pricing') ? '#pricing' : '#examples'}
        pricesBeforeReviews={pricesBeforeReviews}
      />
      <Outlet context={meta} />
      <SiteFooter variant="crm" brandHref={brandHref} />
      <CrmTotop />
      <CrmAssistant key={meta.solution} chips={meta.assistChips} solution={meta.solution} />
      <CookieBanner />
    </CrmUiProvider>
  )
}
