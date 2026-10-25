import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CRM_FAQ, FREE_FAQ_OVERRIDES } from '@/data/crm-faq'
import type { CrmSolution } from '@/types/crm'
import { usePhoneMask } from '@/hooks/usePhoneMask'
import { sendCrmChat, sendCrmLead } from '@/lib/leads'

const ASSIST_CONTACT_REPLY = 'Спасибо за вопрос! Мы скоро с вами свяжемся, чтобы ответить на него.'
const ASSIST_OPEN_DELAY_MS = 20_000

type Chip = { q: string; reply?: string }

const CHIP_REPLIES: Record<string, string> = {
  'Заказать CRM': 'Отлично! Скоро свяжемся с вами.',
  'Получить бесплатно': 'Хорошо, оформим бесплатный пакет. Скоро свяжемся.',
}

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ')
}

type Msg =
  | { id: string; role: 'bot' | 'user'; text: string }
  | { id: string; role: 'bot'; kind: 'chips'; chips: Chip[] }
  | { id: string; role: 'bot'; kind: 'contact' }

type CrmAssistantProps = {
  chips: readonly [string, string, string]
  solution: CrmSolution
}

function initialGreet(chips: Chip[]): Msg[] {
  return [{ id: 'greet', role: 'bot', kind: 'chips', chips, text: '' }]
}

export function CrmAssistant({ chips, solution }: CrmAssistantProps) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const offerChips = useMemo((): Chip[] => chips.map((q) => ({ q, reply: CHIP_REPLIES[q] })), [chips])
  const [messages, setMessages] = useState<Msg[]>(() => initialGreet(offerChips))
  const [asked, setAsked] = useState<Set<number>>(() => new Set())
  const [contactsDone, setContactsDone] = useState(false)
  const [contactPhone, setContactPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [composer, setComposer] = useState('')
  const [contactError, setContactError] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const phone = usePhoneMask()
  const nameRef = useRef<HTMLInputElement>(null)
  const pendingReplyRef = useRef<string | null>(null)
  const pendingQuestionRef = useRef<string | null>(null)

  const scrollLog = useCallback(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  }, [])

  useEffect(() => {
    scrollLog()
  }, [messages, scrollLog])

  useEffect(() => {
    if (dismissed) return
    const timer = window.setTimeout(() => {
      if (!document.body.classList.contains('is-modal-open')) {
        setOpen(true)
      }
    }, ASSIST_OPEN_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [dismissed])

  const findFaqAnswer = (text: string) => {
    const normalized = normalize(text)
    const index = CRM_FAQ.findIndex((item) => normalize(item.q) === normalized)
    if (index === -1) return null
    const item = CRM_FAQ[index]
    if (solution === 'free' && FREE_FAQ_OVERRIDES[item.q]) {
      return { q: item.q, a: FREE_FAQ_OVERRIDES[item.q]! }
    }
    return item
  }

  const resolveReply = (text: string, chipIndex = -1) => {
    const chip =
      chipIndex >= 0 ? offerChips[chipIndex] : offerChips.find((c) => normalize(c.q) === normalize(text))
    if (chip?.reply) return chip.reply
    return findFaqAnswer(chip?.q || text)?.a || ASSIST_CONTACT_REPLY
  }

  const showContactCard = useCallback(() => {
    setMessages((prev) => [...prev, { id: `contact-${Date.now()}`, role: 'bot', kind: 'contact' }])
  }, [])

  const answerQuestion = useCallback(
    (question: string, chipIndex = -1) => {
      if (busy) return
      const text = question.trim()
      if (!text) return

      const reply = resolveReply(text, chipIndex)
      setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text }])

      if (chipIndex >= 0) {
        setAsked((prev) => new Set(prev).add(chipIndex))
      }

      if (!contactsDone) {
        pendingReplyRef.current = reply
        pendingQuestionRef.current = text
        window.setTimeout(showContactCard, 280)
        return
      }

      setBusy(true)
      void sendCrmChat({ phone: contactPhone, message: text }).catch(() => {})
      window.setTimeout(() => {
        setMessages((prev) => [...prev, { id: `b-${Date.now()}`, role: 'bot', text: reply }])
        setBusy(false)
      }, 420)
    },
    [busy, contactPhone, contactsDone, showContactCard],
  )

  const submitContact = async () => {
    setContactError(null)
    if (!phone.complete) {
      setContactError('Введите номер полностью: +7 (___) ___-__-__')
      return
    }
    const name = nameRef.current?.value.trim() || 'Заявка из чата'
    const reply = pendingReplyRef.current || ASSIST_CONTACT_REPLY
    const pendingQuestion = pendingQuestionRef.current || ''

    try {
      await sendCrmLead({
        name,
        phone: phone.value,
        source: 'crm-assist',
        message: pendingQuestion,
      })
      if (typeof window.ym === 'function') {
        window.ym(112716152, 'reachGoal', 'crm-chat')
      }
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Не удалось отправить заявку.')
      return
    }

    setContactsDone(true)
    setContactPhone(phone.value)
    pendingReplyRef.current = null
    pendingQuestionRef.current = null

    setMessages((prev) => prev.filter((m) => !('kind' in m && m.kind === 'contact')))
    setMessages((prev) => [
      ...prev,
      { id: `u-phone-${Date.now()}`, role: 'user', text: name ? `${name}, ${phone.value}` : phone.value },
    ])
    window.setTimeout(() => {
      setMessages((prev) => [...prev, { id: `b-reply-${Date.now()}`, role: 'bot', text: reply }])
    }, 320)
  }

  const closePanel = (opts?: { dismiss?: boolean }) => {
    setOpen(false)
    if (opts?.dismiss !== false) setDismissed(true)
  }

  const isModalOpen = document.body.classList.contains('is-modal-open')

  return (
    <div className={`crm-assist${open ? ' is-open' : ''}`}>
      <div className="crm-assist__panel" hidden={!open}>
        <div className="crm-assist__head">
          <div className="crm-assist__status">
            <p className="crm-assist__status-title">
              <span className="crm-assist__online" aria-hidden="true" />
              Пишите, мы онлайн
            </p>
          </div>
          <button className="crm-assist__close" type="button" aria-label="Закрыть" onClick={() => closePanel()}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        <div className="crm-assist__log" ref={logRef}>
          {messages.map((msg) => {
            if ('kind' in msg && msg.kind === 'chips') {
              return (
                <div key={msg.id} className="crm-assist__msg crm-assist__msg--bot">
                  <p className="crm-assist__bubble">Здравствуйте! Выберите вопрос или напишите свой.</p>
                  <div className="crm-assist__chips">
                    {msg.chips.map((chip, index) => (
                      <button
                        key={chip.q}
                        type="button"
                        className={`crm-assist__chip${asked.has(index) ? ' is-asked' : ''}`}
                        disabled={asked.has(index) || busy}
                        onClick={() => answerQuestion(chip.q, index)}
                      >
                        {chip.q}
                      </button>
                    ))}
                  </div>
                </div>
              )
            }
            if ('kind' in msg && msg.kind === 'contact') {
              return (
                <div key={msg.id} className="crm-assist__msg crm-assist__msg--bot">
                  <div className="crm-assist__card">
                    <p className="crm-assist__card-title">Перед тем как продолжить, оставьте имя и телефон.</p>
                    <form
                      className="crm-assist__card-form"
                      onSubmit={(e) => {
                        e.preventDefault()
                        void submitContact()
                      }}
                    >
                      <input
                        ref={nameRef}
                        className="crm-assist__input"
                        type="text"
                        name="name"
                        autoComplete="name"
                        placeholder="Имя"
                      />
                      <input
                        className="crm-assist__input"
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="+7 (___) ___-__-__"
                        value={phone.value}
                        onFocus={phone.onFocus}
                        onChange={phone.onChange}
                        onKeyDown={phone.onKeyDown}
                        onBlur={phone.onBlur}
                      />
                      {contactError ? <p className="crm-assist__form-error">{contactError}</p> : null}
                      <button className="crm-assist__card-submit" type="submit" disabled={!phone.complete}>
                        Отправить
                      </button>
                      <p className="crm-legal-note">
                        Нажимая кнопку, вы соглашаетесь на{' '}
                        <Link to="/legal/consent/">обработку персональных данных</Link> и с{' '}
                        <Link to="/legal/privacy/">политикой конфиденциальности</Link>.
                      </p>
                    </form>
                  </div>
                </div>
              )
            }
            return (
              <div key={msg.id} className={`crm-assist__msg crm-assist__msg--${msg.role}`}>
                <p className="crm-assist__bubble">{msg.text}</p>
              </div>
            )
          })}
        </div>

        <form
          className="crm-assist__composer"
          onSubmit={(event) => {
            event.preventDefault()
            if (messages.some((m) => 'kind' in m && m.kind === 'contact')) return
            answerQuestion(composer)
            setComposer('')
          }}
        >
          <input
            className="crm-assist__composer-input"
            type="text"
            name="question"
            placeholder="Напишите вопрос…"
            autoComplete="off"
            value={composer}
            disabled={busy || messages.some((m) => 'kind' in m && m.kind === 'contact')}
            onChange={(e) => setComposer(e.target.value)}
          />
          <button
            className="crm-assist__send"
            type="submit"
            aria-label="Отправить"
            disabled={busy || messages.some((m) => 'kind' in m && m.kind === 'contact')}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M2.5 8h11M8.5 3.5 13 8l-4.5 4.5" />
            </svg>
          </button>
        </form>
      </div>

      <button
        className="crm-assist__toggle"
        type="button"
        aria-expanded={open}
        aria-label={open ? 'Закрыть ассистента' : 'Открыть ассистента'}
        onClick={() => {
          if (isModalOpen) return
          if (open) closePanel()
          else {
            setOpen(true)
            setDismissed(false)
          }
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path d="M5 6.5h14v9H9l-4 3v-12z" />
        </svg>
        <span className="crm-assist__toggle-label">Спросить</span>
      </button>
    </div>
  )
}

declare global {
  interface Window {
    ym?: (id: number, method: string, goal: string) => void
  }
}
