import { useCallback, useState, type ReactNode } from 'react';
import { SiteBackBadge } from '@/components/layout/SiteBackBadge';
import { DemoDiscussModal } from '@/components/demo/DemoDiscussModal';

export function DemoAppChrome({ children }: { children: ReactNode }) {
  const [discussOpen, setDiscussOpen] = useState(false);
  const openDiscuss = useCallback(() => setDiscussOpen(true), []);

  return (
    <>
      {children}
      <SiteBackBadge onDiscuss={openDiscuss} />
      <DemoDiscussModal open={discussOpen} onOpenChange={setDiscussOpen} />
    </>
  );
}
