export type CareFactIconId =
  | 'drop'
  | 'scissors'
  | 'ruler'
  | 'thermometer'
  | 'snow'
  | 'sun'
  | 'calendar'
  | 'angle'
  | 'note'
  | 'box'
  | 'leaf'

type Props = {
  id: CareFactIconId
  size?: number
}

export function CareFactIcon({ id, size = 20 }: Props) {
  switch (id) {
    case 'drop':
      return (
        <svg className="flowers-care-ico" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M12 2.1C8 7.6 5 10.8 5 14.35 5 18.34 8.16 22 12 22s7-3.66 7-7.65C19 10.8 16 7.6 12 2.1z"
          />
        </svg>
      )
    case 'scissors':
      return (
        <svg className="flowers-care-ico flowers-care-ico--stroke" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" />
        </svg>
      )
    case 'ruler':
      return (
        <svg className="flowers-care-ico flowers-care-ico--stroke" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d="M4 8h12l4 4-8 8H4V8z" />
          <path d="M9 12h2M13 8h2" />
        </svg>
      )
    case 'thermometer':
      return (
        <svg className="flowers-care-ico flowers-care-ico--stroke" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 1 1 4 0Z" />
          <path d="M12 17v1" />
        </svg>
      )
    case 'snow':
      return (
        <svg className="flowers-care-ico flowers-care-ico--stroke" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2v20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07M2 12h20M5.64 7.05l12.72 9.9M18.36 7.05l-12.72 9.9" />
        </svg>
      )
    case 'sun':
      return (
        <svg className="flowers-care-ico flowers-care-ico--stroke" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )
    case 'calendar':
      return (
        <svg className="flowers-care-ico flowers-care-ico--stroke" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      )
    case 'angle':
      return (
        <svg className="flowers-care-ico flowers-care-ico--stroke" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d="M4 20 20 4" />
          <path d="M4 20h8v-8" />
        </svg>
      )
    case 'note':
      return (
        <svg className="flowers-care-ico flowers-care-ico--stroke" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="8" y1="13" x2="16" y2="13" />
          <line x1="8" y1="17" x2="13" y2="17" />
        </svg>
      )
    case 'box':
      return (
        <svg className="flowers-care-ico flowers-care-ico--stroke" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      )
    case 'leaf':
      return (
        <svg className="flowers-care-ico flowers-care-ico--stroke" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
          <path d="M12 22c-4-3-8-8-8-13a8 8 0 0 1 16 0c0 5-4 10-8 13z" />
          <path d="M12 22V9" />
        </svg>
      )
    default:
      return null
  }
}
