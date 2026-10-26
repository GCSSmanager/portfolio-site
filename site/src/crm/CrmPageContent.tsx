import type { CrmPageId } from '@/crm/pageConfig'
import { AboutCrmArticle } from '@/crm/sections/AboutCrmArticle'
import { CrmCases } from '@/crm/sections/CrmCases'
import { CrmContacts } from '@/crm/sections/CrmContacts'
import { CrmGuide } from '@/crm/sections/CrmGuide'
import { CrmHero } from '@/crm/sections/CrmHero'
import { CrmIntegrations } from '@/crm/sections/CrmIntegrations'
import { CrmKit } from '@/crm/sections/CrmKit'
import { CrmPartners } from '@/crm/sections/CrmPartners'
import { CrmPlans } from '@/crm/sections/CrmPlans'
import { CrmSystemExamples } from '@/crm/sections/CrmSystemExamples'
import { CrmProcess } from '@/crm/sections/CrmProcess'
import { CrmQuiz } from '@/crm/sections/CrmQuiz'
import { CrmReviews } from '@/crm/sections/CrmReviews'
import { crmPageConfig } from '@/crm/pageConfig'

type CrmPageContentProps = {
  page: CrmPageId
}

export function CrmPageContent({ page }: CrmPageContentProps) {
  const cfg = crmPageConfig[page]

  return (
    <>
      {cfg.sections.includes('hero') ? (
        <CrmHero
          heroTitle={cfg.heroTitle}
          heroMark={cfg.heroMark}
          heroCta={cfg.heroCta}
          dealAlways={cfg.dealAlways}
        />
      ) : null}
      {cfg.sections.includes('plans') ? <CrmPlans showPricing={cfg.showPricing} /> : null}
      {cfg.sections.includes('kit') ? <CrmKit /> : null}
      {cfg.sections.includes('integrations') ? <CrmIntegrations /> : null}
      {cfg.sections.includes('about') ? <AboutCrmArticle /> : null}
      {cfg.sections.includes('process') ? <CrmProcess /> : null}
      {cfg.sections.includes('reviews') ? <CrmReviews /> : null}
      {cfg.sections.includes('cases') ? <CrmCases /> : null}
      {cfg.sections.includes('examples') ? <CrmSystemExamples /> : null}
      {cfg.sections.includes('guide') ? <CrmGuide faqVariant={cfg.faqVariant} /> : null}
      {cfg.sections.includes('quiz') ? <CrmQuiz /> : null}
      {cfg.sections.includes('partners') ? <CrmPartners /> : null}
      {cfg.sections.includes('contacts') ? (
        <CrmContacts showContactsDeal={cfg.showContactsDeal} />
      ) : null}
    </>
  )
}
