import { useOutletContext } from 'react-router-dom'
import { PageMeta } from '@/components/seo/PageMeta'
import { CrmJsonLd } from '@/seo/CrmJsonLd'
import { CrmPageContent } from '@/crm/CrmPageContent'
import type { CrmPageId } from '@/crm/pageConfig'
import type { CrmLayoutContext } from '@/layouts/CrmLayout'

type CrmPageShellProps = {
  page: CrmPageId
}

export function CrmPageShell({ page }: CrmPageShellProps) {
  const meta = useOutletContext<CrmLayoutContext>()

  return (
    <>
      <PageMeta crmSolution={meta.solution} />
      <CrmJsonLd
        title={meta.title}
        description={meta.description}
        canonical={meta.canonical}
        solution={meta.solution}
      />
      <main className="site-main site-main--crm">
        <CrmPageContent page={page} />
      </main>
    </>
  )
}
