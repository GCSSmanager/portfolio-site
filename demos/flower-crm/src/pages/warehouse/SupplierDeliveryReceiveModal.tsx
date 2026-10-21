import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CrmModal } from '../../components/ui/CrmModal'
import { CrmInlineQtyField } from '../../components/form/CrmInlineQtyField'
import type { SupplierDeliveryCareRow } from '../../components/crm/stock/types'
import { validateReceiveRealizationDefectQty } from '../../utils/discardRealizationQty'

export type SupplierDeliveryReceiveLinePayload = {
  line_id: number
  received: number
  defect: number
  realization_quantity?: number
}

export type SupplierDeliveryReceiveResult = { ok: true } | { ok: false; error: string }

type LineDraft = {
  lineId: number
  displayName: string
  ordered: number
  plannedRealization: number
  received: string
  defect: string
  realizationQty: string
}

function parseQty(s: string): number | null {
  const t = s.trim()
  if (t === '') return null
  const n = Number.parseInt(t, 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** Пустое поле «брак из реализации» = 0. */
function parseReceiveRealizationQty(s: string): number {
  const n = parseQty(s)
  return n ?? 0
}

function formatDeliveryDateRu(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`)
  return Number.isNaN(d.getTime())
    ? isoDate
    : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function goodQtyFromDraft(d: LineDraft): number | null {
  const received = parseQty(d.received)
  const defect = parseQty(d.defect)
  if (received === null || defect === null) return null
  if (defect > received) return null
  return Math.max(0, received - defect)
}

type SupplierReceiveLineState = {
  received: number | null
  defectNum: number
  defectInvalid: boolean
  onStock: number | null
  realizationIssue: string | null
  rqInvalid: boolean
}

function supplierReceiveLineState(d: LineDraft): SupplierReceiveLineState {
  const received = parseQty(d.received)
  const defectParsed = parseQty(d.defect)
  const defectNum = defectParsed ?? 0
  const defectInvalid =
    received != null && defectParsed != null && defectParsed > received
  const onStock =
    received != null && !defectInvalid && received > 0 ? received - defectNum : null
  const goodQty =
    received != null && defectNum <= received ? Math.max(0, received - defectNum) : 0
  const rq = parseReceiveRealizationQty(d.realizationQty)
  const realizationIssue =
    d.plannedRealization > 0 && received != null && defectNum <= received
      ? validateReceiveRealizationDefectQty(rq, defectNum, d.plannedRealization, goodQty)
      : null
  return {
    received,
    defectNum,
    defectInvalid,
    onStock,
    realizationIssue,
    rqInvalid: realizationIssue != null,
  }
}

type SupplierReceiveLineCardProps = {
  d: LineDraft
  issue: string | null
  state: SupplierReceiveLineState
  onReceived: (v: string) => void
  onDefect: (v: string) => void
  onRealizationQty: (v: string) => void
}

function SupplierReceiveLineCard({
  d,
  issue,
  state,
  onReceived,
  onDefect,
  onRealizationQty,
}: SupplierReceiveLineCardProps) {
  const { received, defectInvalid, onStock, realizationIssue, rqInvalid } = state
  return (
    <li className={`crm-inventory-card${issue != null ? ' crm-inventory-card--invalid' : ''}`}>
      <p className="crm-inventory-card__title">{d.displayName}</p>
      <div className="crm-inventory-card__row">
        <span className="crm-inventory-card__label">По накладной</span>
        <span className="crm-inventory-card__system">
          {d.ordered}
          {d.plannedRealization > 0 ? (
            <span className="crm-supplier-receive-table__stock-hint">
              {' '}
              · реал. {d.plannedRealization}
            </span>
          ) : null}
          <span className="crm-supplier-receive-table__unit"> шт</span>
        </span>
      </div>
      <div className="crm-inventory-card__row crm-inventory-card__row--field">
        <span className="crm-inventory-card__label">Принято</span>
        <div className="crm-inventory-card__control">
          <CrmInlineQtyField
            value={d.received}
            onChange={(e) => onReceived(e.target.value)}
            min={0}
            wrapperClass="crm-supplier-receive-table__qty"
            aria-label={`Принято: ${d.displayName}`}
          />
          {onStock != null ? (
            <span className="crm-supplier-receive-table__stock-hint">на склад: {onStock}</span>
          ) : null}
        </div>
      </div>
      <div className="crm-inventory-card__row crm-inventory-card__row--field">
        <span className="crm-inventory-card__label">Из них брак</span>
        <div className="crm-inventory-card__control">
          <CrmInlineQtyField
            value={d.defect}
            onChange={(e) => onDefect(e.target.value)}
            min={0}
            max={received != null && received > 0 ? received : undefined}
            invalid={defectInvalid}
            wrapperClass="crm-supplier-receive-table__qty crm-supplier-receive-table__qty--defect"
            aria-label={`Из них брак: ${d.displayName}`}
          />
        </div>
      </div>
      {d.plannedRealization > 0 ? (
        <div className="crm-inventory-card__row crm-inventory-card__row--field">
          <span className="crm-inventory-card__label">Брак из реализации</span>
          <div className="crm-inventory-card__control">
            <CrmInlineQtyField
              value={d.realizationQty}
              onChange={(e) => onRealizationQty(e.target.value)}
              min={0}
              max={
                received != null && !defectInvalid
                  ? Math.min(state.defectNum, d.plannedRealization)
                  : undefined
              }
              invalid={rqInvalid}
              wrapperClass="crm-supplier-receive-table__qty"
              aria-label={`Брак из реализации: ${d.displayName}`}
            />
            <span className="crm-supplier-receive-table__stock-hint">
              в накладной {d.plannedRealization}
            </span>
            {realizationIssue ? (
              <p className="crm-field__error" role="alert">
                {realizationIssue}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  )
}

function draftsFromRow(row: SupplierDeliveryCareRow): LineDraft[] {
  return row.lines.map((l) => ({
    lineId: l.id,
    displayName: l.display_name,
    ordered: l.quantity,
    plannedRealization: l.realization_quantity ?? 0,
    received: String(l.quantity),
    defect: '0',
    realizationQty: '0',
  }))
}

export function SupplierDeliveryReceiveModal({
  open,
  row,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean
  row: SupplierDeliveryCareRow | null
  busy: boolean
  onClose: () => void
  onConfirm: (
    lines: SupplierDeliveryReceiveLinePayload[],
  ) => void | Promise<void | SupplierDeliveryReceiveResult>
}) {
  const [drafts, setDrafts] = useState<LineDraft[]>([])
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || row == null) return
    setDrafts(draftsFromRow(row))
    setLocalError(null)
  }, [open, row])

  const handleDialogClose = useCallback(() => {
    setLocalError(null)
    onClose()
  }, [onClose])

  const lineIssues = useMemo(() => {
    return drafts.map((d) => {
      const received = parseQty(d.received)
      const defect = parseQty(d.defect)
      if (received === null || defect === null) return null
      if (defect > received) return 'Брак не может быть больше принятого.'
      const onStock = goodQtyFromDraft(d)
      if (onStock == null) return null
      if (d.plannedRealization <= 0) return null
      const rq = parseReceiveRealizationQty(d.realizationQty)
      return validateReceiveRealizationDefectQty(rq, defect, d.plannedRealization, onStock)
    })
  }, [drafts])

  const canSubmit = useMemo(() => {
    if (drafts.length === 0) return false
    if (lineIssues.some((m) => m != null)) return false
    return drafts.some((d) => {
      const received = parseQty(d.received)
      return received != null && received > 0
    })
  }, [drafts, lineIssues])

  const setReceived = (lineId: number, v: string) => {
    setDrafts((prev) => prev.map((d) => (d.lineId === lineId ? { ...d, received: v } : d)))
    setLocalError(null)
  }

  const setDefect = (lineId: number, v: string) => {
    setDrafts((prev) => prev.map((d) => (d.lineId === lineId ? { ...d, defect: v } : d)))
    setLocalError(null)
  }

  const setRealizationQty = (lineId: number, v: string) => {
    setDrafts((prev) => prev.map((d) => (d.lineId === lineId ? { ...d, realizationQty: v } : d)))
    setLocalError(null)
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!row || !canSubmit) return
    const payload: SupplierDeliveryReceiveLinePayload[] = []
    for (const d of drafts) {
      const received = parseQty(d.received)
      const defect = parseQty(d.defect)
      if (received === null || defect === null) {
        setLocalError('Укажите целые числа ≥ 0 в «Принято» и «Из них брак».')
        return
      }
      if (defect > received) {
        setLocalError('Брак не может быть больше принятого.')
        return
      }
      const item: SupplierDeliveryReceiveLinePayload = {
        line_id: d.lineId,
        received,
        defect,
      }
      if (d.plannedRealization > 0) {
        item.realization_quantity = parseReceiveRealizationQty(d.realizationQty)
      }
      payload.push(item)
    }
    if (!payload.some((p) => p.received > 0)) {
      setLocalError('Укажите принятое количество хотя бы по одной позиции.')
      return
    }
    void Promise.resolve(onConfirm(payload)).then((outcome) => {
      if (outcome && outcome.ok === false) {
        setLocalError(outcome.error)
      }
    })
  }

  const dateRu = row ? formatDeliveryDateRu(row.expected_arrival_date) : ''

  return (
    <CrmModal
      open={open}
      onClose={handleDialogClose}
      title="Приёмка поставки"
      width="3xl"
      busy={busy}
      portal
      onSubmit={submit}
      className="crm-modal--supplier-receive"
    >
      {row ? (
        <>
          <p className="crm-supplier-receive__lead">
            <strong>{row.supplier_name}</strong>
            <span className="crm-supplier-receive__meta"> · привоз {dateRu}</span>
          </p>
          {localError ? (
            <p className="crm-field__error" role="alert">
              {localError}
            </p>
          ) : null}
          <ul className="crm-inventory-cards" aria-label="Позиции приёмки">
            {drafts.map((d, i) => (
              <SupplierReceiveLineCard
                key={d.lineId}
                d={d}
                issue={lineIssues[i]}
                state={supplierReceiveLineState(d)}
                onReceived={(v) => setReceived(d.lineId, v)}
                onDefect={(v) => setDefect(d.lineId, v)}
                onRealizationQty={(v) => setRealizationQty(d.lineId, v)}
              />
            ))}
          </ul>
          <div className="crm-supplier-receive-table-wrap crm-inventory-table-wrap--desktop">
            <table className="crm-supplier-receive-table">
              <thead>
                <tr>
                  <th scope="col">Товар</th>
                  <th scope="col" className="crm-supplier-receive-table__num">
                    По накладной
                  </th>
                  <th scope="col" className="crm-supplier-receive-table__num">
                    Принято
                  </th>
                  <th scope="col" className="crm-supplier-receive-table__num">
                    Из них брак
                  </th>
                  <th scope="col" className="crm-supplier-receive-table__num">
                    Брак из реализации
                  </th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((d, i) => {
                  const issue = lineIssues[i]
                  const state = supplierReceiveLineState(d)
                  const {
                    received,
                    defectNum,
                    defectInvalid,
                    onStock,
                    realizationIssue,
                    rqInvalid,
                  } = state
                  return (
                    <tr
                      key={d.lineId}
                      className={
                        issue != null ? 'crm-supplier-receive-table__row--invalid' : undefined
                      }
                    >
                      <td className="crm-supplier-receive-table__name">{d.displayName}</td>
                      <td className="crm-supplier-receive-table__num">
                        <span className="crm-supplier-receive-table__ordered">{d.ordered}</span>
                        {d.plannedRealization > 0 ? (
                          <span className="crm-supplier-receive-table__stock-hint">
                            реал. {d.plannedRealization}
                          </span>
                        ) : null}
                        <span className="crm-supplier-receive-table__unit"> шт</span>
                      </td>
                      <td className="crm-supplier-receive-table__num">
                        <CrmInlineQtyField
                          value={d.received}
                          onChange={(e) => setReceived(d.lineId, e.target.value)}
                          min={0}
                          wrapperClass="crm-supplier-receive-table__qty"
                          aria-label={`Принято: ${d.displayName}`}
                        />
                        {onStock != null ? (
                          <span className="crm-supplier-receive-table__stock-hint">
                            на склад: {onStock}
                          </span>
                        ) : null}
                      </td>
                      <td className="crm-supplier-receive-table__num">
                        <CrmInlineQtyField
                          value={d.defect}
                          onChange={(e) => setDefect(d.lineId, e.target.value)}
                          min={0}
                          max={received != null && received > 0 ? received : undefined}
                          invalid={defectInvalid}
                          wrapperClass="crm-supplier-receive-table__qty crm-supplier-receive-table__qty--defect"
                          aria-label={`Из них брак: ${d.displayName}`}
                        />
                      </td>
                      <td className="crm-supplier-receive-table__num">
                        {d.plannedRealization > 0 ? (
                          <>
                            <CrmInlineQtyField
                              value={d.realizationQty}
                              onChange={(e) => setRealizationQty(d.lineId, e.target.value)}
                              min={0}
                              max={
                                received != null && !defectInvalid
                                  ? Math.min(defectNum, d.plannedRealization)
                                  : undefined
                              }
                              invalid={rqInvalid}
                              wrapperClass="crm-supplier-receive-table__qty"
                              aria-label={`Брак из реализации: ${d.displayName}`}
                            />
                            <span className="crm-supplier-receive-table__stock-hint">
                              в накладной {d.plannedRealization}
                            </span>
                            {realizationIssue ? (
                              <p className="crm-field__error" role="alert">
                                {realizationIssue}
                              </p>
                            ) : null}
                          </>
                        ) : (
                          <span className="crm-supplier-receive-table__unit">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {lineIssues.some((m) => m != null) ? (
            <p className="crm-field__error" role="status">
              {lineIssues.find((m) => m != null)}
            </p>
          ) : null}
        </>
      ) : null}

      <CrmModal.Actions
        submitLabel="Принять на склад"
        submitDisabled={!canSubmit || row == null}
        submitBusy={busy}
      />
    </CrmModal>
  )
}
