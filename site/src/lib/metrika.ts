export const METRIKA_COUNTER = 112716152

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void
  }
}

export function getMetrikaClientId(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof window.ym !== 'function') {
      resolve(null)
      return
    }
    try {
      window.ym(METRIKA_COUNTER, 'getClientID', (id: string) => {
        resolve(id ? String(id) : null)
      })
    } catch {
      resolve(null)
    }
  })
}

export type MetrikaLeadParams = {
  source: string
  name: string
  phone: string
  message?: string
}

export async function buildMetrikaPayload(
  goal: string,
  lead: MetrikaLeadParams,
): Promise<{
  goal: string
  clientId?: string
  pageUrl?: string
  params: { lead: MetrikaLeadParams }
}> {
  const clientId = await getMetrikaClientId()
  const params: MetrikaLeadParams = {
    source: lead.source,
    name: lead.name,
    phone: lead.phone,
  }
  if (lead.message) {
    params.message = lead.message.slice(0, 500)
  }
  return {
    goal,
    clientId: clientId ?? undefined,
    pageUrl: typeof location !== 'undefined' ? location.href : undefined,
    params: { lead: params },
  }
}
