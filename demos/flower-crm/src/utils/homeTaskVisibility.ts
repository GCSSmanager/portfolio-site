import type { CrmPickOption } from '../pages/warehouse'

export const VIS_FLORIST = 'florist'

/** Список «Кто видит» с бэкенда (уже с именами флористов). */
export function buildVisibilityPickOptions(
  choices: { value: string; label: string }[],
): CrmPickOption[] {
  const seen = new Set<string>()
  const out: CrmPickOption[] = []
  for (const c of choices) {
    if (c.value === VIS_FLORIST) continue
    if (seen.has(c.value)) continue
    seen.add(c.value)
    out.push({ value: c.value, label: c.label })
  }
  return out
}

export function visibilityPickValue(visibility: string, assigneeId: number | null): string {
  if (visibility === VIS_FLORIST && assigneeId != null) return `florist:${assigneeId}`
  return visibility
}

export function parseVisibilityPickValue(value: string): {
  visibility: string
  assignee_id: number | null
} {
  if (value.startsWith('florist:')) {
    const id = Number.parseInt(value.slice(7), 10)
    return { visibility: VIS_FLORIST, assignee_id: Number.isFinite(id) ? id : null }
  }
  return { visibility: value, assignee_id: null }
}
