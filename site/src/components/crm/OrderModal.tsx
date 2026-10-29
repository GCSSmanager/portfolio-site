import type { RefObject } from 'react'
import { LegalNote } from '@/components/crm/LegalNote'
import type { usePhoneMask } from '@/hooks/usePhoneMask'

type PhoneMask = ReturnType<typeof usePhoneMask>

type OrderModalProps = {
  open: boolean
  showDeal: boolean
  orderSource: string
  success: boolean
  error: string | null
  phone: PhoneMask
  nameRef: RefObject<HTMLInputElement | null>
  messageRef: RefObject<HTMLTextAreaElement | null>
  sending: boolean
  onClose: () => void
  onSubmit: () => void
}

export function OrderModal({
  open,
  showDeal,
  orderSource,
  success,
  error,
  phone,
  nameRef,
  messageRef,
  sending,
  onClose,
  onSubmit,
}: OrderModalProps) {
  if (!open) return null

  return (
    <div className="modal modal--form is-open" id="orderModal" aria-hidden="false">
      <div className="modal__overlay" onClick={sending ? undefined : onClose} />
      <div
        className="modal__panel modal__panel--form"
        role="dialog"
        aria-modal="true"
        aria-labelledby="orderModalTitle"
      >
        <div className="modal__header">
          <h2 className="modal__title" id="orderModalTitle">
            {success ? 'Заявка принята' : orderSource === 'nav-order' ? 'Консультация' : 'Оставить заявку'}
          </h2>
          <button className="modal__close" type="button" aria-label="Закрыть" disabled={sending} onClick={onClose}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
        <div className="modal__body">
          {!success ? (
            <div className="crm-order-form-block" id="orderFormBlock">
              {showDeal ? (
                <div className="crm-order-deal">
                  <span className="crm-order-deal__badge">−10%</span>
                  <p className="crm-order-deal__text">Скидка при заказе с сайта — зафиксируем в заявке</p>
                </div>
              ) : null}
              <form
                className="crm-order-form"
                id="orderForm"
                onSubmit={(event) => {
                  event.preventDefault()
                  onSubmit()
                }}
              >
                <label className="crm-order-form__field">
                  <span className="crm-order-form__label">
                    Имя <span className="crm-field-optional">необязательно</span>
                  </span>
                  <input
                    ref={nameRef}
                    className="crm-order-form__input"
                    type="text"
                    name="name"
                    autoComplete="name"
                  />
                </label>
                <label className="crm-order-form__field">
                  <span className="crm-order-form__label">Телефон</span>
                  <input
                    className="crm-order-form__input"
                    type="tel"
                    name="phone"
                    id="orderPhone"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+7 (___) ___-__-__"
                    required
                    value={phone.value}
                    onFocus={phone.onFocus}
                    onChange={phone.onChange}
                    onKeyDown={phone.onKeyDown}
                    onBlur={phone.onBlur}
                  />
                </label>
                <label className="crm-order-form__field">
                  <span className="crm-order-form__label">
                    Комментарий <span className="crm-field-optional">необязательно</span>
                  </span>
                  <textarea
                    ref={messageRef}
                    className="crm-order-form__input crm-order-form__textarea"
                    name="message"
                    rows={3}
                    maxLength={500}
                    placeholder="Например: отрасль, задача, пожелания к внедрению"
                  />
                </label>
                {error ? <p className="crm-order-form__error">{error}</p> : null}
                <button className="btn btn--primary crm-order-form__submit" type="submit" disabled={!phone.complete || sending}>
                  {sending ? 'Отправка...' : 'Отправить'}
                </button>
                <LegalNote />
              </form>
            </div>
          ) : (
            <div className="crm-order-success" id="orderSuccess">
              <p className="crm-order-success__text">Спасибо! Мы свяжемся с вами в течение часа.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
