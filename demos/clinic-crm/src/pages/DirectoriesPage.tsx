import { useState } from "react";
import { PageHeader } from "../components/ui";
import { EmployeesTab } from "./directories/EmployeesTab";
import { SpecialtiesTab } from "./directories/SpecialtiesTab";
import { ServicesTab } from "./directories/ServicesTab";
import { RoomsTab } from "./directories/RoomsTab";
import { ClientsTab } from "./directories/ClientsTab";
import { AbsencesTab } from "./directories/AbsencesTab";

const TABS = [
  { id: "employees", label: "Специалисты", short: "Спец." },
  { id: "specialties", label: "Специальности", short: "Спец-ти" },
  { id: "services", label: "Услуги", short: "Услуги" },
  { id: "rooms", label: "Кабинеты", short: "Каб." },
  { id: "clients", label: "Клиенты", short: "Клиенты" },
  { id: "absences", label: "Отсутствия", short: "Отсут." },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function DirectoriesPage() {
  const [tab, setTab] = useState<TabId>("employees");

  return (
    <div className="p-4 sm:p-6">
      <PageHeader title="Справочники" />

      <div className="mb-5 grid grid-cols-3 gap-1 rounded-2xl border border-line bg-panel p-1 sm:mb-6 sm:inline-flex sm:w-auto sm:max-w-full">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={[
              "min-w-0 rounded-xl px-1 py-2 text-center text-[11px] font-medium leading-tight transition-colors sm:shrink-0 sm:px-4 sm:text-sm sm:leading-normal",
              tab === t.id ? "bg-brand text-white shadow-sm" : "text-ink-muted hover:bg-surface hover:text-ink",
            ].join(" ")}
          >
            <span className="block truncate sm:hidden">{t.short}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "employees" && <EmployeesTab />}
      {tab === "specialties" && <SpecialtiesTab />}
      {tab === "services" && <ServicesTab />}
      {tab === "rooms" && <RoomsTab />}
      {tab === "clients" && <ClientsTab />}
      {tab === "absences" && <AbsencesTab />}
    </div>
  );
}
