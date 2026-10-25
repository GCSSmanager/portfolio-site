import { useLocation } from 'react-router-dom'

const DEMOS = [
  {
    href: '/crm/demo/flower/',
    className: 'crm-demo-picker__card crm-demo-picker__card--flower',
    thumb: '/data/flower-crm/thumbnail.webp',
    tag: 'Цветочный магазин',
    name: 'Склад, уход, продажи',
  },
  {
    href: '/crm/demo/clinic/',
    className: 'crm-demo-picker__card crm-demo-picker__card--clinic',
    thumb: '/data/clinic-crm/thumbnail.webp',
    tag: 'Медицинский центр',
    name: 'Запись, расписание, документы',
  },
] as const

type DemoPickerModalProps = {
  open: boolean
  onClose: () => void
}

export function DemoPickerModal({ open, onClose }: DemoPickerModalProps) {
  const location = useLocation()
  const from = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`)

  if (!open) return null

  return (
    <div className="modal modal--demos is-open" id="demoPickerModal" aria-hidden="false">
      <div className="modal__overlay" onClick={onClose} />
      <div
        className="modal__panel modal__panel--demos"
        role="dialog"
        aria-modal="true"
        aria-labelledby="demoPickerTitle"
      >
        <div className="modal__header">
          <h2 className="modal__title" id="demoPickerTitle">
            Выберите демо CRM
          </h2>
          <button className="modal__close" type="button" aria-label="Закрыть" onClick={onClose}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
        <div className="modal__body">
          <ul className="crm-demo-picker__list">
            {DEMOS.map((demo) => (
              <li key={demo.href}>
                <a
                  className={demo.className}
                  href={`${demo.href}?from=${from}`}
                  target="_blank"
                  rel="noopener"
                >
                  <span className="crm-demo-picker__thumb">
                    <img src={demo.thumb} alt="" width={640} height={360} loading="lazy" decoding="async" />
                  </span>
                  <span className="crm-demo-picker__copy">
                    <span className="crm-demo-picker__tag">{demo.tag}</span>
                    <span className="crm-demo-picker__name">{demo.name}</span>
                    <span className="crm-demo-picker__go">
                      <span>Открыть демо</span>
                      <svg className="crm-demo-picker__go-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path
                          d="M3.5 8h7.5M8.5 5.5 11 8l-2.5 2.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
