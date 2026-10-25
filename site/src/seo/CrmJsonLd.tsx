import type { CrmSolution } from '@/types/crm'
import { buildSchemaGraph } from '@/seo/crmJsonLdGraph'

type CrmJsonLdProps = {
  title: string
  description: string
  canonical: string
  solution: CrmSolution
}

const SERVICE_SOLUTIONS = new Set<CrmSolution>(['custom', 'free', 'integrations'])

export function CrmJsonLd({ title, description, canonical, solution }: CrmJsonLdProps) {
  const seo = { title, description, canonical }
  const json = buildSchemaGraph(seo, SERVICE_SOLUTIONS.has(solution))

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  )
}
