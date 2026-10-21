import type { HomeSectionView } from '../components/crm/stock/types'
import type { DemoCustomTask, DemoDb, DemoUser } from './types'

function shopUserId(user: DemoUser): number {
  if (user.role === 'florist' && user.owner_id) return user.owner_id
  return user.id
}

export const SYSTEM_TASK_KEYS = [
  'supplier_deliveries',
  'customer_orders',
  'flower_care',
  'inventory',
  'expense_payments',
  'missing_sale_price',
] as const

export type SystemTaskKey = (typeof SYSTEM_TASK_KEYS)[number]

export type HomeTaskGates = Record<SystemTaskKey, boolean>

function parseIsoDate(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00.000Z`)
}

function addCalendarDays(iso: string, delta: number): string {
  const d = parseIsoDate(iso)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

function advancePeriodicDue(dueDateIso: string, period: string): string {
  const base = dueDateIso.slice(0, 10)
  if (period === 'daily') return addCalendarDays(base, 1)
  if (period === 'monthly') {
    const d = parseIsoDate(base)
    let month = d.getUTCMonth() + 1
    let year = d.getUTCFullYear()
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const day = Math.min(d.getUTCDate(), lastDay)
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  return addCalendarDays(base, 7)
}

export function visibilityMatches(
  sessionUser: DemoUser,
  shopUid: number,
  visibility: string,
  assigneeId: number | null,
): boolean {
  if (visibility === 'all') return true
  if (visibility === 'owner') {
    return sessionUser.role === 'owner' && sessionUser.id === shopUid
  }
  if (visibility === 'all_florists') return sessionUser.role === 'florist'
  if (visibility === 'florist') {
    if (sessionUser.role !== 'florist') return false
    return assigneeId === sessionUser.id
  }
  return false
}

export function customTaskIsDue(task: DemoCustomTask, todayIso: string): boolean {
  if (task.schedule_kind === 'once' && task.completed_at) return false
  if (task.due_date) {
    const dueDay = task.due_date.slice(0, 10)
    if (dueDay > todayIso) return false
  }
  return true
}

export function homeTaskGatesForViewer(db: DemoDb, sessionUser: DemoUser): HomeTaskGates {
  const shopUid = shopUserId(sessionUser)
  const gates = Object.fromEntries(SYSTEM_TASK_KEYS.map((k) => [k, false])) as HomeTaskGates
  for (const row of db.systemTasks.filter((t) => t.user_id === shopUid && t.enabled)) {
    if (
      visibilityMatches(sessionUser, shopUid, row.visibility, row.assignee_id) &&
      row.task_key in gates
    ) {
      gates[row.task_key as SystemTaskKey] = true
    }
  }
  return gates
}

function serializeCustomTaskView(t: DemoCustomTask) {
  return {
    id: t.id,
    name: t.name,
    section_id: t.section_id,
    enabled: t.enabled,
    visibility: t.visibility,
    assignee_id: t.assignee_id,
    schedule_kind: t.schedule_kind,
    period: t.period,
    due_date: t.due_date,
    completed_at: t.completed_at,
    note: t.note,
    schedule_label: t.schedule_kind === 'periodic' ? 'Периодически' : 'Разово',
    sort_order: t.sort_order,
  }
}

/** Разделы главной: feeds из включённых системных задач + кастомные (как FlowerFlow). */
export function homeSectionsForViewer(db: DemoDb, sessionUser: DemoUser): HomeSectionView[] {
  const shopUid = shopUserId(sessionUser)
  const todayIso = db.demoDay
  const gates = homeTaskGatesForViewer(db, sessionUser)

  const feedsBySection = new Map<number, NonNullable<HomeSectionView['feeds']>>()
  let supplierSectionId: number | null = null

  for (const row of db.systemTasks.filter((t) => t.user_id === shopUid)) {
    if (!gates[row.task_key as SystemTaskKey]) continue
    if (row.section_id == null) continue
    const feeds = feedsBySection.get(row.section_id) ?? {}
    feeds[row.task_key as keyof typeof feeds] = true
    feedsBySection.set(row.section_id, feeds)
    if (row.task_key === 'supplier_deliveries') supplierSectionId = row.section_id
  }

  if (supplierSectionId != null && gates.flower_care) {
    const feeds = feedsBySection.get(supplierSectionId) ?? {}
    feeds.intake = true
    feedsBySection.set(supplierSectionId, feeds)
  }

  const customBySection = new Map<number, ReturnType<typeof serializeCustomTaskView>[]>()
  for (const t of db.customTasks.filter((x) => x.user_id === shopUid)) {
    if (!t.enabled) continue
    if (!visibilityMatches(sessionUser, shopUid, t.visibility, t.assignee_id)) continue
    if (!customTaskIsDue(t, todayIso)) continue
    if (t.section_id == null) continue
    const list = customBySection.get(t.section_id) ?? []
    list.push(serializeCustomTaskView(t))
    customBySection.set(t.section_id, list)
  }

  const out: HomeSectionView[] = []
  for (const s of db.homeSections.filter((x) => x.user_id === shopUid).sort((a, b) => a.sort_order - b.sort_order)) {
    const feeds = feedsBySection.get(s.id) ?? {}
    const custom_tasks = customBySection.get(s.id) ?? []
    if (Object.keys(feeds).length === 0 && custom_tasks.length === 0) continue
    out.push({
      id: s.id,
      section_key: s.section_key,
      name: s.name,
      is_builtin: s.is_builtin,
      sort_order: s.sort_order,
      feeds,
      custom_tasks,
    })
  }
  return out
}

export function canCompleteCustomTask(
  sessionUser: DemoUser,
  shopUid: number,
  task: DemoCustomTask,
): boolean {
  if (!task.enabled) return false
  return visibilityMatches(sessionUser, shopUid, task.visibility, task.assignee_id)
}

export function completeCustomHomeTask(db: DemoDb, task: DemoCustomTask): void {
  if (task.schedule_kind === 'periodic') {
    const base = (task.due_date ?? `${db.demoDay}T00:00:00.000Z`).slice(0, 10)
    const nextDay = advancePeriodicDue(base, task.period || 'weekly')
    task.due_date = `${nextDay}T00:00:00.000Z`
    task.completed_at = null
    return
  }
  task.completed_at = new Date().toISOString()
}
