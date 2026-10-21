import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { CrmButton } from '../../ui/CrmButton'
import { CrmModal } from '../../ui/CrmModal'
import { CrmDateTimeField, CrmField } from '../../form'
import {
  isoDateTimeToDdMmYyAndHhMm,
  isOnceDueInputBad,
  resolveOnceDueIso,
} from '../../../utils/receivedAtRuInput'
import {
  buildVisibilityPickOptions,
  parseVisibilityPickValue,
  visibilityPickValue,
} from '../../../utils/homeTaskVisibility'
import { CrmPickField, type CrmPickOption } from '../../../pages/warehouse'
import type { HomeSectionRow } from '../stock/types'

type Choice = { value: string; label: string }

export type HomeCustomTaskFormInitial = {
  name: string
  section_id: number | null
  visibility: string
  assignee_id: number | null
  schedule_kind: string
  period: string
  due_date: string | null
  note: string
}

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  busy: boolean
  error: string | null
  visibilityChoices: Choice[]
  scheduleKindChoices: Choice[]
  periodChoices: Choice[]
  sections: HomeSectionRow[]
  initial?: HomeCustomTaskFormInitial | null
  onClose: () => void
  onSubmit: (body: Record<string, unknown>) => void | Promise<void>
  onDelete?: () => void | Promise<void>
}

const DUE_HINT =
  'Дата и время напоминания. Если оставить пустым — подставятся текущие дата и время.'

const PERIODIC_DUE_HINT = `${DUE_HINT} После отметки сдвинется на следующий период.`

export function HomeCustomTaskModal({
  open,
  mode,
  busy,
  error,
  visibilityChoices,
  scheduleKindChoices,
  periodChoices,
  sections,
  initial,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const [name, setName] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [visibility, setVisibility] = useState('all')
  const [scheduleKind, setScheduleKind] = useState('once')
  const [period, setPeriod] = useState('weekly')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && initial) {
      setName(initial.name)
      setSectionId(initial.section_id != null ? String(initial.section_id) : '')
      setVisibility(visibilityPickValue(initial.visibility, initial.assignee_id))
      setScheduleKind(initial.schedule_kind)
      setPeriod(initial.period || 'weekly')
      const { date, time } = isoDateTimeToDdMmYyAndHhMm(initial.due_date)
      setDueDate(date)
      setDueTime(time)
      setNote(initial.note)
      return
    }
    setName('')
    const more = sections.find((s) => s.section_key === 'more')
    setSectionId(more ? String(more.id) : sections[0] ? String(sections[0].id) : '')
    setVisibility('all')
    setScheduleKind('once')
    setPeriod('weekly')
    setDueDate('')
    setDueTime('')
    setNote('')
  }, [open, mode, initial, sections])

  const sectionOptions: CrmPickOption[] = useMemo(
    () => sections.map((s) => ({ value: String(s.id), label: s.name })),
    [sections],
  )

  const visibilityOptions = useMemo(
    () => buildVisibilityPickOptions(visibilityChoices),
    [visibilityChoices],
  )

  const scheduleOptions: CrmPickOption[] = useMemo(
    () => scheduleKindChoices.map((c) => ({ value: c.value, label: c.label })),
    [scheduleKindChoices],
  )

  const periodOptions: CrmPickOption[] = useMemo(
    () => periodChoices.map((c) => ({ value: c.value, label: c.label })),
    [periodChoices],
  )

  const isPeriodic = scheduleKind === 'periodic'
  const dueInvalid = isOnceDueInputBad(dueDate, dueTime)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const { visibility: vis, assignee_id } = parseVisibilityPickValue(visibility)
    const body: Record<string, unknown> = {
      name: trimmed,
      visibility: vis,
      schedule_kind: scheduleKind,
      note: note.trim(),
      due_date: resolveOnceDueIso(dueDate, dueTime),
    }
    if (sectionId) body.section_id = Number.parseInt(sectionId, 10)
    if (assignee_id != null) body.assignee_id = assignee_id
    if (isPeriodic) body.period = period
    void onSubmit(body)
  }

  return (
    <CrmModal
      open={open}
      onClose={onClose}
      title={mode === 'edit' ? 'Редактировать задачу' : 'Новая задача'}
      width="md"
      busy={busy}
      onSubmit={submit}
    >
      <CrmField label="Название" value={name} disabled={busy} onChange={(e) => setName(e.target.value)} />
      <CrmPickField
        label="Раздел"
        value={sectionId}
        options={sectionOptions}
        onChange={setSectionId}
        disabled={busy}
        clampLabels
      />
      <CrmPickField
        label="Кто видит"
        value={visibility}
        options={visibilityOptions}
        onChange={setVisibility}
        disabled={busy}
      />
      <CrmPickField
        label="Расписание"
        value={scheduleKind}
        options={scheduleOptions}
        onChange={setScheduleKind}
        disabled={busy}
      />
      {isPeriodic ? (
        <CrmPickField
          label="Период"
          value={period}
          options={periodOptions}
          onChange={setPeriod}
          disabled={busy}
        />
      ) : null}
      <CrmDateTimeField
        label={isPeriodic ? 'Дата и время ближайшего напоминания' : 'Дата и время (необязательно)'}
        dateValue={dueDate}
        timeValue={dueTime}
        onDateChange={setDueDate}
        onTimeChange={setDueTime}
        disabled={busy}
        invalid={dueInvalid}
        hint={isPeriodic ? PERIODIC_DUE_HINT : DUE_HINT}
        dateAriaLabel="Дата напоминания"
        timeAriaLabel="Время напоминания"
      />
      <CrmField label="Заметка" value={note} disabled={busy} onChange={(e) => setNote(e.target.value)} />
      {error ? (
        <p className="crm-field__hint" role="alert" style={{ color: '#9a3b3b' }}>
          {error}
        </p>
      ) : null}
      {mode === 'edit' && onDelete ? (
        <CrmButton variant="tasksModalDel" disabled={busy} onClick={() => void onDelete()}>
          Удалить задачу
        </CrmButton>
      ) : null}
      <CrmModal.Actions
        submitLabel={mode === 'edit' ? 'Сохранить' : 'Создать'}
        submitDisabled={busy || !name.trim() || !sectionId || dueInvalid}
        submitBusy={busy}
      />
    </CrmModal>
  )
}
