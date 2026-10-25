import { useCallback, useMemo, useState } from 'react'
import { PageMeta } from '@/components/seo/PageMeta'
import { buildKpPdfDoc } from '@/lib/kp/buildPdfDoc'
import {
  formatDate,
  formatDays,
  formatPrice,
  formatWorkDays,
  lines,
  parsePrice,
  todayISO,
} from '@/lib/kp/format'
import { loadKpLogoDataUrl } from '@/lib/kp/logo'
import type { KpStage } from '@/lib/kp/types'

function newStage(): KpStage {
  return { id: crypto.randomUUID(), name: '', scope: '', days: 0, price: 0 }
}

export function KpPage() {
  const [client, setClient] = useState('')
  const [dateIso, setDateIso] = useState(todayISO)
  const [title, setTitle] = useState('')
  const [lead, setLead] = useState('')
  const [terms, setTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [stages, setStages] = useState<KpStage[]>(() => [newStage()])

  const visibleStages = useMemo(
    () => stages.filter((s) => s.name || s.scope || s.days || s.price),
    [stages],
  )
  const totalPrice = visibleStages.reduce((sum, s) => sum + s.price, 0)
  const totalDays = visibleStages.reduce((sum, s) => sum + s.days, 0)
  const termLines = lines(terms)
  const noteLines = lines(notes)

  const updateStage = useCallback((id: string, patch: Partial<KpStage>) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [])

  const addStage = () => setStages((prev) => [...prev, newStage()])

  const removeStage = (id: string) => {
    setStages((prev) => {
      if (prev.length === 1) {
        return [{ ...prev[0], name: '', scope: '', days: 0, price: 0 }]
      }
      return prev.filter((s) => s.id !== id)
    })
  }

  const downloadPdf = async () => {
    const [{ default: pdfMake }, pdfFonts] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ])
    const pdfMakeInstance = pdfMake as typeof pdfMake & { vfs?: Record<string, string> }
    const fontBundle = pdfFonts as { pdfMake?: { vfs: Record<string, string> }; vfs?: Record<string, string> }
    pdfMakeInstance.vfs = fontBundle.pdfMake?.vfs ?? fontBundle.vfs

    const logo = await loadKpLogoDataUrl()
    const doc = buildKpPdfDoc({
      form: { client, dateIso, title, lead, terms, notes, stages: visibleStages },
      logo,
    })
    const fileTitle = title.trim() || 'КП'
    const blob = await pdfMakeInstance.createPdf(doc).getBlob()
    const url = URL.createObjectURL(blob)
    const opened = window.open(url, '_blank')
    if (!opened) {
      const link = document.createElement('a')
      link.href = url
      link.download = `${fileTitle}.pdf`
      link.click()
    }
  }

  return (
    <>
      <PageMeta bodyClass="kp-page" />
      <header className="kp-bar">
        <div className="kp-bar__brand">
          <img className="kp-bar__logo" src="/assets/gcss-logo.webp" alt="" width={36} height={36} />
          <div>
            <p className="kp-bar__title">Коммерческое предложение</p>
            <p className="kp-bar__hint">Заполните поля — справа лист, из него PDF</p>
          </div>
        </div>
        <button className="btn btn--primary btn--lure-light" type="button" onClick={() => void downloadPdf()}>
          Скачать PDF
        </button>
      </header>

      <main className="kp-work">
        <form
          className="kp-editor"
          onSubmit={(event) => event.preventDefault()}
        >
          <label className="kp-field">
            <span className="kp-field__label">Заказчик</span>
            <input
              className="kp-field__ctrl"
              type="text"
              placeholder="Компания или имя"
              value={client}
              onChange={(e) => setClient(e.target.value)}
            />
          </label>

          <label className="kp-field">
            <span className="kp-field__label">Дата</span>
            <input
              className="kp-field__ctrl"
              type="date"
              value={dateIso}
              onChange={(e) => setDateIso(e.target.value)}
            />
          </label>

          <label className="kp-field">
            <span className="kp-field__label">Название</span>
            <input
              className="kp-field__ctrl"
              type="text"
              placeholder="Сайт с CRM"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="kp-field">
            <span className="kp-field__label">Кратко</span>
            <textarea
              className="kp-field__ctrl"
              rows={3}
              placeholder="Что получает заказчик на этом этапе"
              value={lead}
              onChange={(e) => setLead(e.target.value)}
            />
          </label>

          <label className="kp-field">
            <span className="kp-field__label">Условия</span>
            <textarea
              className="kp-field__ctrl"
              rows={2}
              placeholder="Каждое условие с новой строки"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
            />
          </label>

          <div className="kp-stages">
            <div className="kp-stages__head">
              <span className="kp-field__label">Этапы</span>
              <span className="kp-days-sum">{formatWorkDays(totalDays)}</span>
              <button className="kp-add" type="button" onClick={addStage}>
                Добавить этап
              </button>
            </div>
            <div className="kp-stages-list">
              {stages.map((stage) => (
                <article key={stage.id} className="kp-stage">
                  <textarea
                    className="kp-field__ctrl"
                    rows={2}
                    placeholder="Состав"
                    value={stage.scope}
                    onChange={(e) => updateStage(stage.id, { scope: e.target.value })}
                  />
                  <div className="kp-stage__row">
                    <input
                      className="kp-field__ctrl"
                      placeholder="Этап"
                      value={stage.name}
                      onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                    />
                    <input
                      className="kp-field__ctrl kp-field__ctrl--days"
                      inputMode="numeric"
                      placeholder="Дни"
                      aria-label="Дни"
                      value={stage.days || ''}
                      onChange={(e) => updateStage(stage.id, { days: parsePrice(e.target.value) })}
                    />
                    <input
                      className="kp-field__ctrl kp-field__ctrl--price"
                      inputMode="numeric"
                      placeholder="Цена"
                      aria-label="Цена"
                      value={stage.price || ''}
                      onChange={(e) => updateStage(stage.id, { price: parsePrice(e.target.value) })}
                    />
                    <button
                      className="kp-row-del"
                      type="button"
                      aria-label="Удалить этап"
                      onClick={() => removeStage(stage.id)}
                    >
                      ×
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <label className="kp-field">
            <span className="kp-field__label">Примечания</span>
            <textarea
              className="kp-field__ctrl"
              rows={3}
              placeholder="Необязательно"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </form>

        <section className="kp-preview" aria-label="Лист КП">
          <article className="kp-sheet">
            <header className="kp-head">
              <div className="kp-brand">
                <img className="kp-brand__logo" src="/assets/gcss-logo.webp" alt="" width={56} height={56} />
                <div>
                  <p className="kp-brand__name">ГКСС</p>
                  <p className="kp-brand__note">Гибкие корпоративные системы и сервисы</p>
                </div>
              </div>
              <div className="kp-meta">
                <p className="kp-meta__label">Коммерческое предложение</p>
                <p className="kp-meta__date">{formatDate(dateIso)}</p>
                {client ? <p className="kp-meta__client">Заказчик: {client}</p> : null}
              </div>
            </header>

            {title ? <h1 className="kp-title">{title}</h1> : null}
            {lead ? <p className="kp-lead">{lead}</p> : null}

            {termLines.length ? (
              <ul className="kp-terms">
                {termLines.map((term) => (
                  <li key={term}>{term}</li>
                ))}
              </ul>
            ) : null}

            <table className="kp-table">
              <thead>
                <tr>
                  <th>Этап</th>
                  <th>Состав</th>
                  <th>Дни</th>
                  <th>Цена</th>
                </tr>
              </thead>
              <tbody>
                {visibleStages.map((stage, index) => (
                  <tr key={stage.id}>
                    <td>{stage.name ? `${index + 1}. ${stage.name}` : `Этап ${index + 1}`}</td>
                    <td>{stage.scope}</td>
                    <td>{formatDays(stage.days)}</td>
                    <td>{stage.price ? formatPrice(stage.price) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={2}>Итого</th>
                  <td>{formatWorkDays(totalDays)}</td>
                  <td>{formatPrice(totalPrice)}</td>
                </tr>
              </tfoot>
            </table>

            {noteLines.length ? (
              <section className="kp-notes">
                {noteLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </section>
            ) : null}
          </article>
        </section>
      </main>
    </>
  )
}
