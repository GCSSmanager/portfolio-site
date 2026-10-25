import { Outlet, useLocation } from 'react-router-dom'
import { useScrollToTopOnNavigate } from '@/hooks/useScrollToTopOnNavigate'
import { CookieBanner } from '@/components/crm/CookieBanner'
import { CrmAssistant } from '@/components/crm/CrmAssistant'
import { CrmNav } from '@/components/crm/CrmNav'
import { CrmTotop } from '@/components/crm/CrmTotop'
import { SiteFooter } from '@/components/site/SiteFooter'
import { CrmUiProvider } from '@/context/CrmUiProvider'
import { crmPages } from '@/crm/meta'
import type { CrmPageMeta } from '@/types/crm'

export type CrmLayoutContext = CrmPageMeta

const metaByPath: Record<string, CrmPageMeta> = {
  '/crm/custom/': crmPages.custom,
  '/crm/free/': crmPages.free,
  '/crm/integrations/': crmPages.integrations,
  '/crm/about/': crmPages.about,
}

export function CrmLayout() {
  const { pathname } = useLocation()
  useScrollToTopOnNavigate()
  const meta = metaByPath[pathname] ?? crmPages.custom
  const brandHref = meta.brandHref ?? `/crm/${meta.solution}/`

  return (
    <CrmUiProvider>
      <CrmNav solution={meta.solution} brandHref={brandHref} dealAlways={meta.dealAlways} />
      <Outlet context={meta} />
      <SiteFooter variant="crm" brandHref={brandHref} />
      <CrmTotop />
      <CrmAssistant key={meta.solution} chips={meta.assistChips} solution={meta.solution} />
      <CookieBanner />
    </CrmUiProvider>
  )
}
