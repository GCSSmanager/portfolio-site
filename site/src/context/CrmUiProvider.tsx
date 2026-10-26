import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { sendCrmLead } from '@/lib/leads'
import { usePhoneMask } from '@/hooks/usePhoneMask'
import { DemoPickerModal } from '@/components/crm/DemoPickerModal'
import { OrderModal } from '@/components/crm/OrderModal'
import { CrmUiContext } from '@/context/crmUiContext'

export function CrmUiProvider({ children }: { children: ReactNode }) {
  const [orderOpen, setOrderOpen] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [orderSource, setOrderSource] = useState('crm-order')
  const [showDeal, setShowDeal] = useState(true)
  const [presetMessage, setPresetMessage] = useState('')
  const phone = usePhoneMask()
  const nameRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)

  const openOrder = useCallback((options?: { source?: string; dealOff?: boolean; message?: string }) => {
    setOrderSuccess(false)
    setOrderError(null)
    setOrderSource(options?.source ?? 'crm-order')
    setShowDeal(!options?.dealOff)
    setPresetMessage(options?.message ?? '')
    phone.reset()
    setOrderOpen(true)
    document.body.classList.add('is-modal-open')
  }, [phone])

  const closeOrder = useCallback(() => {
    setOrderOpen(false)
    if (!demoOpen) {
      document.body.classList.remove('is-modal-open')
    }
  }, [demoOpen])

  const openDemoPicker = useCallback(() => {
    setDemoOpen(true)
    document.body.classList.add('is-modal-open')
  }, [])

  const closeDemoPicker = useCallback(() => {
    setDemoOpen(false)
    if (!orderOpen) {
      document.body.classList.remove('is-modal-open')
    }
  }, [orderOpen])

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const orderBtn = target?.closest<HTMLElement>('[data-order-open]')
      if (orderBtn) {
        event.preventDefault()
        openOrder({
          source: orderBtn.dataset.orderSource,
          dealOff: orderBtn.dataset.orderDeal === 'off',
          message: orderBtn.dataset.orderMessage,
        })
      }
      const demoBtn = target?.closest<HTMLElement>('[data-demo-picker-open]')
      if (demoBtn) {
        event.preventDefault()
        openDemoPicker()
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [openDemoPicker, openOrder])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (orderOpen) closeOrder()
      else if (demoOpen) closeDemoPicker()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeDemoPicker, closeOrder, demoOpen, orderOpen])

  useEffect(() => {
    if (orderOpen && messageRef.current) {
      messageRef.current.value = presetMessage
    }
  }, [orderOpen, presetMessage])

  const submitOrder = useCallback(async () => {
    setOrderError(null)
    if (!phone.complete) {
      setOrderError('Введите номер полностью: +7 (___) ___-__-__')
      return
    }
    const name = nameRef.current?.value.trim() || 'Заявка с сайта'
    const message = messageRef.current?.value.trim() || ''
    try {
      await sendCrmLead({
        name,
        phone: phone.value,
        source: orderSource,
        ...(message ? { message } : {}),
      })
      if (typeof window.ym === 'function') {
        window.ym(112716152, 'reachGoal', 'crm-form')
      }
      setOrderSuccess(true)
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Не удалось отправить заявку.')
    }
  }, [orderSource, phone.complete, phone.value])

  const value = useMemo(() => ({ openOrder, openDemoPicker }), [openDemoPicker, openOrder])

  return (
    <CrmUiContext.Provider value={value}>
      {children}
      <OrderModal
        open={orderOpen}
        showDeal={showDeal}
        orderSource={orderSource}
        success={orderSuccess}
        error={orderError}
        phone={phone}
        nameRef={nameRef}
        messageRef={messageRef}
        onClose={closeOrder}
        onSubmit={submitOrder}
      />
      <DemoPickerModal open={demoOpen} onClose={closeDemoPicker} />
    </CrmUiContext.Provider>
  )
}
