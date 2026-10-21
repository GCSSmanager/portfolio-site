import type { ReactNode } from 'react'

const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const NAV_ICONS: Record<string, ReactNode> = {
  home: (
    <>
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" {...s} />
      <path
        d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        {...s}
      />
    </>
  ),
  warehouse: (
    <>
      <path
        d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"
        {...s}
      />
      <path d="M6 18h12" {...s} />
      <path d="M6 14h12" {...s} />
      <path d="M6 10h12" {...s} />
    </>
  ),
  statistics: (
    <>
      <path d="M3 3v16a2 2 0 0 0 2 2h16" {...s} />
      <path d="M18 17V9" {...s} />
      <path d="M13 17V5" {...s} />
      <path d="M8 17v-3" {...s} />
    </>
  ),
  catalog: (
    <>
      <rect width="7" height="7" x="3" y="3" rx="1" {...s} />
      <rect width="7" height="7" x="14" y="3" rx="1" {...s} />
      <rect width="7" height="7" x="14" y="14" rx="1" {...s} />
      <rect width="7" height="7" x="3" y="14" rx="1" {...s} />
    </>
  ),
  prices: (
    <>
      <path
        d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"
        {...s}
      />
      <circle cx="7.5" cy="7.5" r=".5" {...s} />
    </>
  ),
  suppliers: (
    <>
      <path
        d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"
        {...s}
      />
      <path d="M12 22V12" {...s} />
      <path d="m3.3 7 7.04 4.2a2 2 0 0 0 1.92 0L19.7 7" {...s} />
      <path d="m7.5 4.27 9 5.15" {...s} />
    </>
  ),
  'delivery-services': (
    <>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" {...s} />
      <path d="M15 18H9" {...s} />
      <path
        d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"
        {...s}
      />
      <circle cx="17" cy="18" r="2" {...s} />
      <circle cx="7" cy="18" r="2" {...s} />
    </>
  ),
  staff: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" {...s} />
      <circle cx="9" cy="7" r="4" {...s} />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" {...s} />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" {...s} />
    </>
  ),
  tasks: (
    <>
      <path d="M11 18H3" {...s} />
      <path d="M11 6H3" {...s} />
      <path d="M11 12H3" {...s} />
      <path d="m16 6 2 2 4-4" {...s} />
      <path d="m16 18 2 2 4-4" {...s} />
      <path d="m16 12 2 2 4-4" {...s} />
    </>
  ),
  inventory: (
    <>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" {...s} />
      <path
        d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
        {...s}
      />
      <path d="M12 11h4" {...s} />
      <path d="M12 16h4" {...s} />
      <path d="M8 11h.01" {...s} />
      <path d="M8 16h.01" {...s} />
    </>
  ),
  subscription: (
    <>
      <rect width="20" height="14" x="2" y="5" rx="2" {...s} />
      <path d="M2 10h20" {...s} />
    </>
  ),
  settings: (
    <>
      <path
        d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
        {...s}
      />
      <circle cx="12" cy="12" r="3" {...s} />
    </>
  ),
  sales: (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" {...s} />
      <path d="M3 6h18" {...s} />
      <path d="M16 10a4 4 0 0 1-8 0" {...s} />
    </>
  ),
  expenses: (
    <>
      <path
        d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"
        {...s}
      />
      <path d="M14 8H8" {...s} />
      <path d="M16 12H8" {...s} />
      <path d="M13 16H8" {...s} />
    </>
  ),
}

export function NavMenuIcon({ id, className }: { id: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden focusable="false">
      {NAV_ICONS[id] ?? NAV_ICONS.home}
    </svg>
  )
}
