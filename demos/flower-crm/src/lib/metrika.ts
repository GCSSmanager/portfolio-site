const COUNTER_ID = 112716152

declare global {
  interface Window {
    ym?: (counterId: number, method: string, ...args: unknown[]) => void
  }
}

export function reachCrmFormGoal() {
  if (typeof window.ym === 'function') {
    window.ym(COUNTER_ID, 'reachGoal', 'crm-form')
  }
}
