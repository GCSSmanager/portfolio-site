import { AboutCrmMast } from '@/crm/sections/about-crm/AboutCrmMast'
import { AboutCrmEssence } from '@/crm/sections/about-crm/AboutCrmEssence'
import { AboutCrmExample } from '@/crm/sections/about-crm/AboutCrmExample'
import { AboutCrmAudience } from '@/crm/sections/about-crm/AboutCrmAudience'

export function AboutCrmArticle() {
  return (
    <article className="crm-article" id="about-top">
      <AboutCrmMast />
      <AboutCrmEssence />
      <AboutCrmExample />
      <AboutCrmAudience />
    </article>
  )
}
