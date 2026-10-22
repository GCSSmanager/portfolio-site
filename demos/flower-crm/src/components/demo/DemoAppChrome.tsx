import type { ReactNode } from 'react'
import { flowerDemoShell, DemoShell } from '../../demo-shell'
import { DemoLeadCapture } from './DemoLeadCapture'

const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'

export function DemoAppChrome({ children }: { children: ReactNode }) {
  if (!isDemo) return <>{children}</>
  return (
    <DemoShell config={flowerDemoShell}>
      {children}
      <DemoLeadCapture />
    </DemoShell>
  )
}
