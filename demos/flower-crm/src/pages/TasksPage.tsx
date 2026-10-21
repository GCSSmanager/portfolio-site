import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiFetch } from '../api/apiFetch'
import { useCrmConfirm } from '../hooks/useCrmConfirm'
import { CrmField, CrmToggleField } from '../components/form'
import {
  HomeCustomTaskModal,
  HomeSectionModal,
  type HomeCustomTaskFormInitial,
} from '../components/crm/modals'
import type { HomeSectionRow } from '../components/crm/stock/types'
import { CrmButton } from '../components/ui/CrmButton'
import { CrmPageStatus } from '../components/ui/CrmPageStatus'
import { CrmPageToolbar } from '../components/ui/CrmPageToolbar'
import { CollapsiblePanel } from '../components/ui/CollapsiblePanel'
import {
  buildVisibilityPickOptions,
  parseVisibilityPickValue,
  visibilityPickValue,
} from '../utils/homeTaskVisibility'
import { CrmPickField } from './warehouse'
import './flowersCatalog.css'
import './warehouse/stock/forms-fields.css'
import './warehouse/stock/modal-shell-taxons.css'
import './tasksPage.css'

type Choice = { value: string; label: string }

type SystemTask = {
  task_key: string
  label: string
  description?: string
  section_id: number | null
  enabled: boolean
  visibility: string
  assignee_id: number | null
}

type CustomTask = {
  id: number
  name: string
  section_id: number | null
  enabled: boolean
  visibility: string
  assignee_id: number | null
  schedule_kind: string
  period: string
  due_date: string | null
  note: string
  schedule_label: string
}

type Payload = {
  sections: HomeSectionRow[]
  visibility_choices: Choice[]
  schedule_kind_choices: Choice[]
  period_choices: Choice[]
  enabled_system_tasks: SystemTask[]
  disabled_system_tasks: SystemTask[]
  enabled_custom_tasks: CustomTask[]
  disabled_custom_tasks: CustomTask[]
}

const SYSTEM_ORDER = [
  'supplier_deliveries',
  'customer_orders',
  'flower_care',
  'inventory',
  'expense_payments',
  'missing_sale_price',
]

function mergeSystemTasks(data: Payload): SystemTask[] {
  const map = new Map<string, SystemTask>()
  for (const t of [...data.enabled_system_tasks, ...data.disabled_system_tasks]) {
    map.set(t.task_key, t)
  }
  const out: SystemTask[] = []
  for (const key of SYSTEM_ORDER) {
    const t = map.get(key)
    if (t) out.push(t)
  }
  for (const t of map.values()) {
    if (!SYSTEM_ORDER.includes(t.task_key)) out.push(t)
  }
  return out
}

function mergeCustomTasks(data: Payload): CustomTask[] {
  return [...data.enabled_custom_tasks, ...data.disabled_custom_tasks]
}

function customToFormInitial(task: CustomTask): HomeCustomTaskFormInitial {
  return {
    name: task.name,
    section_id: task.section_id,
    visibility: task.visibility,
    assignee_id: task.assignee_id,
    schedule_kind: task.schedule_kind,
    period: task.period,
    due_date: task.due_date,
    note: task.note,
  }
}

export function TasksPage() {
  const { ask, dialog: confirmDialog } = useCrmConfirm()
  const [data, setData] = useState<Payload | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [formErr, setFormErr] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null)
  const [editTask, setEditTask] = useState<CustomTask | null>(null)
  const [modalErr, setModalErr] = useState<string | null>(null)
  const [sectionsOpen, setSectionsOpen] = useState({
    taskSections: false,
    system: false,
    custom: false,
  })
  const [sectionNameDrafts, setSectionNameDrafts] = useState<Record<number, string>>({})
  const [patchingSectionId, setPatchingSectionId] = useState<number | null>(null)
  const [sectionModalOpen, setSectionModalOpen] = useState(false)
  const [sectionModalErr, setSectionModalErr] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoadErr(null)
    return apiFetch('/api/me/home-tasks/')
      .then(async (res) => {
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(j.error ?? `Ошибка ${res.status}`)
        }
        return res.json() as Promise<Payload>
      })
      .then(setData)
      .catch((e: unknown) => setLoadErr(e instanceof Error ? e.message : 'Не удалось загрузить'))
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const applyPayload = (p: Payload) => setData(p)

  const visibilityOptions = useMemo(
    () => (data ? buildVisibilityPickOptions(data.visibility_choices) : []),
    [data],
  )

  const sectionOptions = useMemo(
    () => (data?.sections ?? []).map((s) => ({ value: String(s.id), label: s.name })),
    [data],
  )

  const systemTasks = useMemo(() => (data ? mergeSystemTasks(data) : []), [data])
  const customTasks = useMemo(() => (data ? mergeCustomTasks(data) : []), [data])
  const customSections = useMemo(
    () => (data?.sections ?? []).filter((s) => !s.is_builtin),
    [data],
  )
  const builtinSections = useMemo(
    () => (data?.sections ?? []).filter((s) => s.is_builtin),
    [data],
  )

  const patchSystem = async (task: SystemTask, patch: Record<string, unknown>) => {
    setBusy(true)
    setFormErr(null)
    try {
      const res = await apiFetch('/api/me/home-tasks/system/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_key: task.task_key, ...patch }),
      })
      const j = (await res.json().catch(() => ({}))) as Payload & { error?: string }
      if (!res.ok) throw new Error(j.error ?? `Ошибка ${res.status}`)
      applyPayload(j)
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : 'Не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  const saveCustom = async (id: number, patch: Record<string, unknown>) => {
    setBusy(true)
    setFormErr(null)
    try {
      const res = await apiFetch(`/api/me/home-tasks/custom/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const j = (await res.json().catch(() => ({}))) as Payload & { error?: string }
      if (!res.ok) throw new Error(j.error ?? `Ошибка ${res.status}`)
      applyPayload(j)
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : 'Не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  const deleteCustom = (id: number) => {
    ask({
      title: 'Удалить задачу?',
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        setBusy(true)
        setModalErr(null)
        try {
          const res = await apiFetch(`/api/me/home-tasks/custom/${id}/`, { method: 'DELETE' })
          const j = (await res.json().catch(() => ({}))) as Payload & { error?: string }
          if (!res.ok) throw new Error(j.error ?? `Ошибка ${res.status}`)
          applyPayload(j)
          setModalMode(null)
          setEditTask(null)
        } catch (e: unknown) {
          setModalErr(e instanceof Error ? e.message : 'Не удалось удалить')
        } finally {
          setBusy(false)
        }
      },
    })
  }

  const submitModal = async (body: Record<string, unknown>) => {
    setBusy(true)
    setModalErr(null)
    try {
      if (modalMode === 'edit' && editTask) {
        const res = await apiFetch(`/api/me/home-tasks/custom/${editTask.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const j = (await res.json().catch(() => ({}))) as Payload & { error?: string }
        if (!res.ok) throw new Error(j.error ?? `Ошибка ${res.status}`)
        applyPayload(j)
      } else {
        const res = await apiFetch('/api/me/home-tasks/custom/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const j = (await res.json().catch(() => ({}))) as Payload & { error?: string }
        if (!res.ok) throw new Error(j.error ?? `Ошибка ${res.status}`)
        applyPayload(j)
      }
      setModalMode(null)
      setEditTask(null)
    } catch (e: unknown) {
      setModalErr(e instanceof Error ? e.message : 'Не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  const clearSectionDraft = (sectionId: number) => {
    setSectionNameDrafts((prev) => {
      const next = { ...prev }
      delete next[sectionId]
      return next
    })
  }

  const patchSectionName = async (sectionId: number, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const current = data?.sections.find((s) => s.id === sectionId)
    if (current && trimmed === current.name) {
      clearSectionDraft(sectionId)
      return
    }
    setPatchingSectionId(sectionId)
    setFormErr(null)
    try {
      const res = await apiFetch(`/api/me/home-tasks/sections/${sectionId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const j = (await res.json().catch(() => ({}))) as Payload & { error?: string }
      if (!res.ok) throw new Error(j.error ?? `Ошибка ${res.status}`)
      applyPayload(j)
      clearSectionDraft(sectionId)
    } catch (e: unknown) {
      setFormErr(e instanceof Error ? e.message : 'Не удалось сохранить раздел')
    } finally {
      setPatchingSectionId(null)
    }
  }

  const commitSectionNameOnBlur = (section: HomeSectionRow) => {
    const draft = sectionNameDrafts[section.id] ?? section.name
    const trimmed = draft.trim()
    if (!trimmed) {
      clearSectionDraft(section.id)
      return
    }
    if (trimmed === section.name) {
      clearSectionDraft(section.id)
      return
    }
    void patchSectionName(section.id, trimmed)
  }

  const deleteSection = (sectionId: number) => {
    ask({
      title: 'Удалить раздел?',
      message: 'Задачи из него перейдут в «Ещё».',
      confirmLabel: 'Удалить',
      onConfirm: async () => {
        setBusy(true)
        setFormErr(null)
        try {
          const res = await apiFetch(`/api/me/home-tasks/sections/${sectionId}/`, { method: 'DELETE' })
          const j = (await res.json().catch(() => ({}))) as Payload & { error?: string }
          if (!res.ok) throw new Error(j.error ?? `Ошибка ${res.status}`)
          applyPayload(j)
        } catch (e: unknown) {
          setFormErr(e instanceof Error ? e.message : 'Не удалось удалить раздел')
        } finally {
          setBusy(false)
        }
      },
    })
  }

  const createSection = async (name: string) => {
    setBusy(true)
    setSectionModalErr(null)
    try {
      const res = await apiFetch('/api/me/home-tasks/sections/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const j = (await res.json().catch(() => ({}))) as Payload & { error?: string }
      if (!res.ok) throw new Error(j.error ?? `Ошибка ${res.status}`)
      applyPayload(j)
      setSectionModalOpen(false)
      setSectionsOpen((s) => ({ ...s, taskSections: true }))
    } catch (e: unknown) {
      setSectionModalErr(e instanceof Error ? e.message : 'Не удалось создать раздел')
    } finally {
      setBusy(false)
    }
  }

  const patchVisibility = (
    task: SystemTask | CustomTask,
    pickValue: string,
    isSystem: boolean,
  ) => {
    const { visibility, assignee_id } = parseVisibilityPickValue(pickValue)
    const patch = { visibility, assignee_id }
    if (isSystem) void patchSystem(task as SystemTask, patch)
    else void saveCustom((task as CustomTask).id, patch)
  }

  const patchSection = (task: SystemTask | CustomTask, sectionValue: string, isSystem: boolean) => {
    const sid = Number.parseInt(sectionValue, 10)
    if (!Number.isFinite(sid)) return
    if (isSystem) void patchSystem(task as SystemTask, { section_id: sid })
    else void saveCustom((task as CustomTask).id, { section_id: sid })
  }

  const renderAssignmentFields = (
    task: SystemTask | CustomTask,
    isSystem: boolean,
  ) => (
    <div className="tasks-page__vis-fields">
      <CrmPickField
        label="Раздел"
        value={task.section_id != null ? String(task.section_id) : ''}
        options={sectionOptions}
        onChange={(v) => patchSection(task, v, isSystem)}
        disabled={busy}
        clampLabels
      />
      <CrmPickField
        label="Кто видит"
        value={visibilityPickValue(task.visibility, task.assignee_id)}
        options={visibilityOptions}
        onChange={(v) => patchVisibility(task, v, isSystem)}
        disabled={busy}
      />
    </div>
  )

  const renderTaskRow = (
    key: string,
    enabled: boolean,
    title: ReactNode,
    meta: ReactNode | null,
    onToggle: (on: boolean) => void,
    visibilityTask: SystemTask | CustomTask | null,
    isSystem: boolean,
    onEdit?: () => void,
  ) => (
    <li key={key} className={`tasks-page__row${enabled ? '' : ' tasks-page__row--off'}`}>
      <CrmToggleField
        checked={enabled}
        disabled={busy}
        onChange={onToggle}
        ariaLabel={typeof title === 'string' ? `${title}: ${enabled ? 'включена' : 'выключена'}` : undefined}
      />
      <div className="tasks-page__row-body">
        <div className="tasks-page__custom-head">
          <strong className="tasks-page__name">{title}</strong>
          {meta}
        </div>
        {enabled && visibilityTask ? renderAssignmentFields(visibilityTask, isSystem) : null}
        {onEdit ? (
          <CrmButton variant="tasksLink" disabled={busy} onClick={onEdit}>
            Редактировать
          </CrmButton>
        ) : null}
      </div>
    </li>
  )

  const modalOpen = modalMode != null

  return (
    <div className="flowers-page flowers-page--tasks">
      <CrmPageToolbar
        layout="stacked"
        title="Задачи на главной"
        lead="Встроенные разделы (Поставки, Уход, Заказы, Ещё) нельзя переименовать. Свои разделы появляются на главной отдельным блоком. Переключатель скрывает задачу с экрана."
        actions={
          <>
            <CrmButton
              variant="flowersHead"
              disabled={!data || busy}
              onClick={() => {
                setSectionModalErr(null)
                setSectionModalOpen(true)
              }}
            >
              Новый раздел
            </CrmButton>
            <CrmButton
              variant="flowersHeadPrimary"
              disabled={!data || busy}
              onClick={() => {
                setModalErr(null)
                setEditTask(null)
                setModalMode('create')
              }}
            >
              Новая задача
            </CrmButton>
          </>
        }
      />

      <CrmPageStatus errors={[loadErr, formErr]} loading={!data} variant="text" />

      {data ? (
        <div className="tasks-page__panels">
          <CollapsiblePanel
            sectionId="tasks-sections"
            title="Разделы задач"
            count={(data.sections ?? []).length}
            expanded={sectionsOpen.taskSections}
            onToggle={() => setSectionsOpen((s) => ({ ...s, taskSections: !s.taskSections }))}
            emptyHint="Свои разделы пока не созданы — «Новый раздел»"
            allowEmptyBody
            className="tasks-page__panel"
          >
            <ul className="tasks-page__list tasks-page__list--sections">
              {builtinSections.map((s) => (
                <li key={s.id} className="tasks-page__row tasks-page__row--builtin">
                  <div className="tasks-page__row-body">
                    <strong className="tasks-page__name">{s.name}</strong>
                    <p className="tasks-page__desc">Встроенный раздел — нельзя переименовать или удалить</p>
                  </div>
                </li>
              ))}
              {customSections.map((s) => {
                const draft = sectionNameDrafts[s.id] ?? s.name
                const sectionBusy = busy || patchingSectionId === s.id
                return (
                  <li key={s.id} className="tasks-page__row">
                    <div className="tasks-page__row-body tasks-page__section-edit">
                      <CrmField
                        label="Название"
                        value={draft}
                        disabled={sectionBusy}
                        onChange={(e) =>
                          setSectionNameDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))
                        }
                        onBlur={() => commitSectionNameOnBlur(s)}
                      />
                      <div className="tasks-page__section-actions">
                        <CrmButton
                          variant="tasksLinkDanger"
                          disabled={sectionBusy}
                          onClick={() => deleteSection(s.id)}
                        >
                          Удалить
                        </CrmButton>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CollapsiblePanel>

          <CollapsiblePanel
            sectionId="tasks-system"
            title="Системные задачи"
            count={systemTasks.length}
            expanded={sectionsOpen.system}
            onToggle={() => setSectionsOpen((s) => ({ ...s, system: !s.system }))}
            emptyHint="Нет системных задач"
            className="tasks-page__panel"
          >
            <ul className="tasks-page__list">
              {systemTasks.map((task) =>
                renderTaskRow(
                  task.task_key,
                  task.enabled,
                  task.label,
                  task.description ? (
                    <p className="tasks-page__desc">{task.description}</p>
                  ) : null,
                  (on) => void patchSystem(task, { enabled: on }),
                  task,
                  true,
                ),
              )}
            </ul>
          </CollapsiblePanel>

          <CollapsiblePanel
            sectionId="tasks-custom"
            title="Пользовательские задачи"
            count={customTasks.length}
            expanded={sectionsOpen.custom}
            onToggle={() => setSectionsOpen((s) => ({ ...s, custom: !s.custom }))}
            emptyHint="Пока нет пользовательских задач — нажмите «Новая задача»"
            allowEmptyBody
            className="tasks-page__panel"
          >
            <ul className="tasks-page__list">
              {customTasks.map((task) =>
                renderTaskRow(
                  String(task.id),
                  task.enabled,
                  task.name,
                  <>
                    <span className="tasks-page__meta">{task.schedule_label}</span>
                    {task.note ? <span className="tasks-page__note">{task.note}</span> : null}
                  </>,
                  (on) => void saveCustom(task.id, { enabled: on }),
                  task,
                  false,
                  () => {
                    setModalErr(null)
                    setEditTask(task)
                    setModalMode('edit')
                  },
                ),
              )}
            </ul>
          </CollapsiblePanel>
        </div>
      ) : null}

      {data ? (
        <HomeCustomTaskModal
          open={modalOpen}
          mode={modalMode === 'edit' ? 'edit' : 'create'}
          busy={busy}
          error={modalErr}
          visibilityChoices={data.visibility_choices}
          scheduleKindChoices={data.schedule_kind_choices}
          periodChoices={data.period_choices}
          sections={data.sections}
          initial={modalMode === 'edit' && editTask ? customToFormInitial(editTask) : null}
          onClose={() => {
            setModalMode(null)
            setEditTask(null)
            setModalErr(null)
          }}
          onSubmit={submitModal}
          onDelete={
            modalMode === 'edit' && editTask
              ? () => deleteCustom(editTask.id)
              : undefined
          }
        />
      ) : null}

      {confirmDialog}

      <HomeSectionModal
        open={sectionModalOpen}
        busy={busy}
        error={sectionModalErr}
        onClose={() => {
          setSectionModalOpen(false)
          setSectionModalErr(null)
        }}
        onSubmit={createSection}
      />
    </div>
  )
}
