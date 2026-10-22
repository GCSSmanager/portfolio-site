import { useCallback, useState } from 'react'
import { DemoDiscussModal } from './DemoDiscussModal'
import { DemoPhoneGate } from './DemoPhoneGate'
import { SiteBackBadge } from './SiteBackBadge'

/** Заявка «Обсудить внедрение», всплывашка через 10 с, гейт телефона через 2 мин — как в clinic-crm. */
export function DemoLeadCapture() {
  const [discussOpen, setDiscussOpen] = useState(false)
  const openDiscuss = useCallback(() => setDiscussOpen(true), [])

  return (
    <>
      <SiteBackBadge onDiscuss={openDiscuss} />
      <DemoPhoneGate paused={discussOpen} />
      <DemoDiscussModal open={discussOpen} onOpenChange={setDiscussOpen} />
    </>
  )
}
