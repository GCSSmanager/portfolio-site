import { useEffect, useState } from 'react'
import { CrmButton } from '../ui/CrmButton'
import { CrmDateField } from '../form'
import {
  ddMmYyToIsoDate,
  isoDateToDdMmYy,
  isReceivedAtDateIncomplete,
  isReceivedAtInputBad,
} from '../../utils/receivedAtRuInput'
import {
  DEFAULT_REPORT_DAYS,
  MAX_REPORT_DAYS,
  clampReportPeriod,
  lastNDaysPeriod,
  periodClampNotice,
  periodSubtitle,
  type ReportPeriodRange,
} from '../../utils/reportPeriod'
import './reportPeriodControls.css'

const PRESETS = [7, 14, 30, 90] as const

type Props = {
  value: ReportPeriodRange
  onChange: (next: ReportPeriodRange) => void
  disabled?: boolean
  className?: string
}

export function ReportPeriodControls({ value, onChange, disabled = false, className }: Props) {
  const clamped = clampReportPeriod(value)
  const [fromMask, setFromMask] = useState(() => isoDateToDdMmYy(clamped.from))
  const [toMask, setToMask] = useState(() => isoDateToDdMmYy(clamped.to))
  const [clampNotice, setClampNotice] = useState<string | null>(null)

  useEffect(() => {
    setFromMask(isoDateToDdMmYy(clamped.from))
    setToMask(isoDateToDdMmYy(clamped.to))
  }, [clamped.from, clamped.to])

  const activePreset = PRESETS.find(
    (n) => clamped.from === lastNDaysPeriod(n).from && clamped.to === lastNDaysPeriod(n).to,
  )

  const tryApply = (next: ReportPeriodRange) => {
    setClampNotice(periodClampNotice(next))
    onChange(clampReportPeriod(next))
  }

  const isoFromMask = (raw: string): string | null => {
    const t = raw.trim()
    if (t === '' || isReceivedAtDateIncomplete(t) || isReceivedAtInputBad(t, '')) return null
    return ddMmYyToIsoDate(t)
  }

  const onFromMaskChange = (next: string) => {
    setFromMask(next)
    const iso = isoFromMask(next)
    if (iso && iso !== clamped.from) {
      tryApply({ from: iso, to: clamped.to })
    }
  }

  const onToMaskChange = (next: string) => {
    setToMask(next)
    const iso = isoFromMask(next)
    if (iso && iso !== clamped.to) {
      tryApply({ from: clamped.from, to: iso })
    }
  }

  const commitFrom = () => {
    const iso = isoFromMask(fromMask)
    if (!iso) {
      setFromMask(isoDateToDdMmYy(clamped.from))
      return
    }
    if (iso !== clamped.from) tryApply({ from: iso, to: clamped.to })
  }

  const commitTo = () => {
    const iso = isoFromMask(toMask)
    if (!iso) {
      setToMask(isoDateToDdMmYy(clamped.to))
      return
    }
    if (iso !== clamped.to) tryApply({ from: clamped.from, to: iso })
  }

  return (
    <div className={['report-period', className].filter(Boolean).join(' ')}>
      <div className="report-period__dates">
        <CrmDateField
          label="С"
          value={fromMask}
          disabled={disabled}
          wrapperClass="crm-field report-period__date-field"
          dateAriaLabel="Начало периода"
          onChange={onFromMaskChange}
          onBlur={commitFrom}
        />
        <span className="report-period__sep" aria-hidden>
          —
        </span>
        <CrmDateField
          label="По"
          value={toMask}
          disabled={disabled}
          wrapperClass="crm-field report-period__date-field"
          dateAriaLabel="Конец периода"
          onChange={onToMaskChange}
          onBlur={commitTo}
        />
      </div>
      <div className="report-period__presets" role="group" aria-label="Быстрый выбор периода">
        {PRESETS.map((n) => (
          <CrmButton
            key={n}
            variant="custom"
            className={
              activePreset === n
                ? 'crm-btn--period-preset crm-btn--period-preset-active'
                : 'crm-btn--period-preset'
            }
            disabled={disabled}
            onClick={() => {
              setClampNotice(null)
              tryApply(lastNDaysPeriod(n))
            }}
          >
            {n} дн.
          </CrmButton>
        ))}
      </div>
      <p className="report-period__hint">
        {periodSubtitle(clamped)}
        <span className="report-period__limit"> · не больше {MAX_REPORT_DAYS} дн.</span>
      </p>
      {clampNotice ? (
        <p className="report-period__warn" role="status">
          {clampNotice}
        </p>
      ) : null}
    </div>
  )
}

export { DEFAULT_REPORT_DAYS, MAX_REPORT_DAYS }
