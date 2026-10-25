export type CrmPlanKey = 'custom' | 'catalog'

export type CrmReviewKey =
  | 'abris'
  | 'praktika'
  | 'kamelia'
  | 'motorlab'
  | 'severkuhnya'
  | 'sila'

export type CrmCaseKey = 'flower' | 'pest' | 'clinic'

export type CrmHeroProps = {
  heroTitle?: string
  heroMark?: string
  heroCta?: string
  heroMore?: string
  dealAlways?: boolean
}

export type CrmPlansProps = {
  plansEyebrow?: string
  plansTitle?: string
  planKeys?: CrmPlanKey[]
  showPricing?: boolean
}

export type CrmKitProps = Record<string, never>

export type CrmProcessProps = Record<string, never>

export type CrmReviewsProps = {
  reviewKeys?: CrmReviewKey[]
}

export type CrmCasesProps = {
  caseKeys?: CrmCaseKey[]
}

export type CrmPricingProps = Record<string, never>

export type CrmGuideProps = {
  faqVariant?: 'free' | string
}

export type CrmQuizProps = Record<string, never>

export type CrmContactsProps = {
  showContactsDeal?: boolean
}

export type CrmIntegrationsProps = Record<string, never>

export type AboutCrmArticleProps = Record<string, never>
