import type { ReactNode, Ref } from "react";
import { createPortal } from "react-dom";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import type { Appointment, DiagnosticPeriod } from "../../lib/types";
import { formatServiceName } from "../../lib/service-label";
import { formatDiagnosticLabel } from "../../lib/schedule/dayBlocks";
import { minToTime } from "../../lib/format";
import { formatSpecialistNames } from "../../lib/group-sessions";

interface Props {
  appointments: Appointment[];
  diagnosticPeriods?: DiagnosticPeriod[];
  visible: boolean;
  position: { top: number; left: number };
  previewRef?: Ref<HTMLDivElement>;
}

function formatAppointmentDate(date: string) {
  return format(parseISO(date.slice(0, 10)), "d MMMM yyyy", { locale: ru });
}

export function AppointmentDetailsPreview({
  appointments,
  diagnosticPeriods = [],
  visible,
  position,
  previewRef,
}: Props) {
  if (!visible || appointments.length === 0) return null;

  const primary = appointments[0]!;
  const uniqueClients = new Map<string, string>();
  for (const item of appointments) {
    uniqueClients.set(item.client.id, item.client.fullName);
  }
  const clientNames = [...uniqueClients.values()];
  const isGroup = clientNames.length > 1;
  const specialistLabel = formatSpecialistNames(appointments);
  const title = primary.diagnosticPeriodId
    ? formatDiagnosticLabel(
        diagnosticPeriods.find((period) => period.id === primary.diagnosticPeriodId)?.title,
        true,
      )
    : formatServiceName(primary.service);

  return createPortal(
    <div
      ref={previewRef}
      className="pointer-events-none fixed z-[120] w-[280px] max-h-[calc(100vh-16px)] overflow-y-auto rounded-2xl border border-line bg-panel p-3 shadow-float"
      style={{ top: position.top, left: position.left }}
      role="tooltip"
    >
      <div className="flex items-start gap-2">
        <span className="mt-1 h-8 w-1 shrink-0 rounded-full" style={{ background: primary.service.color }} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-snug text-ink">{title}</div>
          <div className="mt-1 text-xs tabular-nums text-brand-dark">
            {minToTime(primary.startMin)}–{minToTime(primary.endMin)}
          </div>
          <div className="mt-0.5 text-[11px] text-ink-muted">{formatAppointmentDate(primary.date)}</div>
        </div>
      </div>

      <div className="mt-3 space-y-2 text-[11px] leading-relaxed">
        <PreviewRow
          label={isGroup ? `Клиенты · ${clientNames.length}` : "Клиент"}
          value={
            isGroup ? (
              <ul className="mt-1 space-y-0.5">
                {clientNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            ) : (
              primary.client.fullName
            )
          }
        />
        <PreviewRow
          label={appointments.length > 1 && specialistLabel.includes(",") ? "Специалисты" : "Специалист"}
          value={specialistLabel}
        />
        <PreviewRow label="Кабинет" value={primary.room?.name ?? "—"} />
        {primary.note?.trim() && <PreviewRow label="Заметка" value={primary.note.trim()} />}
      </div>
    </div>,
    document.body,
  );
}

function PreviewRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</div>
      <div className="mt-0.5 text-ink">{value}</div>
    </div>
  );
}
