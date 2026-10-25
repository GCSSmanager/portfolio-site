export type CrmSolution = 'custom' | 'free' | 'integrations' | 'about'

export type CrmPageMeta = {
  title: string
  description: string
  canonical: string
  solution: CrmSolution
  dealAlways?: boolean
  /** Три полных текста кнопок в виджете «Спросить». */
  assistChips: readonly [string, string, string]
  brandHref?: string
}
