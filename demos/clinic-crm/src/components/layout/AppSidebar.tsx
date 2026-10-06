import { NavPanel } from "./NavPanel";

export function AppSidebar() {
  return (
    <aside className="hidden lg:flex w-60 shrink-0 bg-panel border-r border-line flex-col">
      <NavPanel />
    </aside>
  );
}
