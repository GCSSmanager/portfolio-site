import { useEffect, useState } from 'react'

export function CrmTotop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const toggle = () => setVisible(window.scrollY > 280)
    window.addEventListener('scroll', toggle, { passive: true })
    toggle()
    return () => window.removeEventListener('scroll', toggle)
  }, [])

  return (
    <a
      className={`crm-totop${visible ? ' is-visible' : ''}`}
      href="#crmNav"
      aria-label="Наверх"
      onClick={(event) => {
        event.preventDefault()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }}
    >
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <path d="M3.5 10L8 5.5 12.5 10" />
      </svg>
    </a>
  )
}
