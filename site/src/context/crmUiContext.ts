import { createContext, useContext } from 'react'

type OrderOpenOptions = {
  source?: string
  dealOff?: boolean
  message?: string
}

export type CrmUiContextValue = {
  openOrder: (options?: OrderOpenOptions) => void
  openDemoPicker: () => void
}

export const CrmUiContext = createContext<CrmUiContextValue | null>(null)

export function useCrmUi() {
  const ctx = useContext(CrmUiContext)
  if (!ctx) throw new Error('useCrmUi outside provider')
  return ctx
}
