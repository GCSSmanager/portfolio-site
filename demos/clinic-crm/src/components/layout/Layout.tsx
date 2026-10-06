import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import { clinicDemoShell, DemoShell } from "../../demo-shell";
import { DemoDiscussModal } from "../DemoDiscussModal";
import { DemoPhoneGate } from "../DemoPhoneGate";
import { AppSidebar } from "./AppSidebar";
import { MobileNavDrawer } from "./MobileNavDrawer";
import { MobileTopBar } from "./MobileTopBar";
import { SiteBackBadge } from "./SiteBackBadge";

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [discussOpen, setDiscussOpen] = useState(false);
  const openDiscuss = useCallback(() => setDiscussOpen(true), []);

  return (
    <DemoShell config={clinicDemoShell}>
      <div className="min-h-screen flex bg-surface">
        <AppSidebar />
        <MobileNavDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <MobileTopBar onOpenMenu={() => setMenuOpen(true)} />
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>

        <SiteBackBadge onDiscuss={openDiscuss} />
        <DemoPhoneGate paused={discussOpen} />
        <DemoDiscussModal open={discussOpen} onOpenChange={setDiscussOpen} />
      </div>
    </DemoShell>
  );
}
