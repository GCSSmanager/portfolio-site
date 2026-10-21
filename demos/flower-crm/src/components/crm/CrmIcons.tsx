type IconProps = { size?: number }

const stroke = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.65,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function IconScissors({ size = 18 }: IconProps) {
  return (
    <svg className="crm-ico crm-ico--stroke" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" />
    </svg>
  )
}

export function IconDrop({ size = 18 }: IconProps) {
  return (
    <svg className="crm-ico" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 2.1C8 7.6 5 10.8 5 14.35 5 18.34 8.16 22 12 22s7-3.66 7-7.65C19 10.8 16 7.6 12 2.1z"
      />
    </svg>
  )
}

export function IconCareSheet({ size = 18 }: IconProps) {
  return (
    <svg className="crm-ico crm-ico--stroke" width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="14" y2="17" />
    </svg>
  )
}

/** Утиль / списание: испорченный цветок (Lucide flower + перечёркивание, ISC). */
export function IconWaste({ size = 18 }: IconProps) {
  return (
    <svg className="crm-ico crm-ico--stroke" width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 16.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 1 1 12 7.5a4.5 4.5 0 1 1 4.5 4.5 4.5 4.5 0 1 1-4.5 4.5" />
      <path d="M12 7.5V9M7.5 12H9M16.5 12H15M12 16.5V15" />
      <path d="m8 8 1.88 1.88M14.12 9.88 16 8M8 16l1.88-1.88M14.12 14.12 16 16" />
      <path d="M4 4l16 16" />
    </svg>
  )
}

export function IconSprout({ size = 18 }: IconProps) {
  return (
    <svg className="crm-ico crm-ico--stroke" width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M12 22V12" />
      <path d="M12 12c-2-4-6-5-8-2 2-2 5-1 8 2" />
      <path d="M12 12c2-4 6-5 8-2-2-2-5-1-8 2" />
    </svg>
  )
}

export function IconCart({ size = 18 }: IconProps) {
  return (
    <svg className="crm-ico crm-ico--stroke" width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="9" cy="20" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.35" fill="currentColor" stroke="none" />
      <path d="M1 2h3l1.5 9h13l2-7H6" />
    </svg>
  )
}

export function IconDeliveryTruck({ size = 18 }: IconProps) {
  return (
    <svg className="crm-ico crm-ico--stroke" width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18h2" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <path d="M2 18h4" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  )
}

/** Собранный букет (Lucide flower-2, ISC). */
export function IconBouquet({ size = 18 }: IconProps) {
  return (
    <svg className="crm-ico crm-ico--stroke" width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1" />
      <circle cx="12" cy="8" r="2" />
      <path d="M12 10v12" />
      <path d="M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z" />
      <path d="M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z" />
    </svg>
  )
}

/** Отметить задачу выполненной. */
export function IconTaskCheck({ size = 18 }: IconProps) {
  return (
    <svg className="crm-ico crm-ico--stroke" width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.2 2.4 2.4L16 9.5" />
    </svg>
  )
}

export function IconIntakeBox({ size = 18 }: IconProps) {
  return (
    <svg className="crm-ico crm-ico--stroke" width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}
