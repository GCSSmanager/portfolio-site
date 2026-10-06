import { useState } from "react";
import { ScheduleToolbar } from "../components/schedule-toolbar";
import { ScheduleEmptyState } from "../components/ScheduleEmptyState";
import { ScheduleGrid } from "../components/ScheduleGrid";
import { LoadPanel } from "../components/LoadPanel";
import { AppointmentPopover } from "../components/appointment-popover";
import { AutoSlotPicker } from "../components/AutoSlotPicker";
import { ClientCardModal } from "../components/ClientCardModal";
import { ClientSchedulePrintModal } from "../components/ClientSchedulePrintModal";
import { DaySchedulePrintModal } from "../components/DaySchedulePrintModal";
import { formatServiceName } from "../lib/service-label";
import { ScheduleDisplaySettings } from "../components/ScheduleDisplaySettings";
import { Modal } from "../components/ui";
import { useSchedulePage } from "../hooks/useSchedulePage";
import { canAccessClientCard } from "../lib/roles";

export function SchedulePage() {
  const vm = useSchedulePage();
  const [cardClientId, setCardClientId] = useState<string | null>(null);
  const canOpenClientCard = vm.user ? canAccessClientCard(vm.user.role) : false;

  return (
    <>
      <ScheduleToolbar
        date={vm.date}
        onChange={vm.setDate}
        totalEmployees={vm.employeesQ.data?.length ?? 0}
        totalAppointments={vm.activeAppointments.length}
        services={vm.canEdit ? (vm.servicesQ.data ?? []) : []}
        rooms={vm.canEdit ? (vm.roomsQ.data ?? []) : []}
        employees={vm.employeesQ.data ?? []}
        specialties={vm.canEdit ? (vm.specialtiesQ.data ?? []) : []}
        highlightServiceId={vm.highlightServiceId}
        onHighlightService={vm.canEdit ? vm.setHighlightServiceId : () => {}}
        highlightClientId={vm.highlightClientId}
        onHighlightClient={vm.canEdit ? vm.setHighlightClientId : () => {}}
        clients={vm.canEdit ? (vm.clientsQ.data ?? []) : []}
        employeeId={vm.employeeId}
        onEmployeeChange={vm.canEdit ? vm.setEmployeeId : () => {}}
        roomId={vm.roomId}
        onRoomChange={vm.canEdit ? vm.setRoomId : () => {}}
        onPrintClient={vm.canEdit ? () => vm.setPrintOpen(true) : undefined}
        onPrintDay={vm.hasEmployees ? () => vm.setDayPrintOpen(true) : undefined}
        onOpenDisplaySettings={vm.canEdit ? () => vm.setDisplaySettingsOpen(true) : undefined}
        readOnly={vm.readOnly}
        title={vm.readOnly ? `Моё расписание${vm.user?.employeeName ? ` · ${vm.user.employeeName}` : ""}` : "Расписание"}
      />

      <div className="p-4 sm:p-6">
        {vm.loading && (
          <div className="flex items-center gap-3 text-ink-muted text-sm py-12 justify-center">
            <span className="w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            Загрузка расписания…
          </div>
        )}

        {vm.employeesQ.isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl px-4 py-3 text-sm">
            Не удалось подключиться к API.
          </div>
        )}

        {!vm.loading && vm.employeeDeleted && (
          <ScheduleEmptyState
            gridRange={vm.clinicGridRange}
            message="Свяжитесь с администратором: специалист удалён из системы."
          />
        )}

        {!vm.employeeDeleted && vm.employeesQ.data && !vm.loading && !vm.hasEmployees && (
          <ScheduleEmptyState
            gridRange={vm.clinicGridRange}
            message={
              vm.readOnly
                ? "Обратитесь к руководителю для привязки аккаунта к специалисту."
                : "Добавьте специалиста в справочниках, чтобы открыть расписание."
            }
          />
        )}

        {!vm.employeeDeleted && vm.employeesQ.data && !vm.loading && vm.hasEmployees && (
          <div className={vm.canEdit ? "grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-5" : ""}>
            <ScheduleGrid
              date={vm.date}
              employees={vm.visibleEmployees}
              appointments={vm.activeAppointments}
              diagnosticPeriods={vm.diagnosticPeriodsQ.data ?? []}
              absences={vm.absencesForDay}
              clinicDays={vm.clinicDaysQ.data ?? []}
              highlightService={vm.canEdit ? vm.highlightService : null}
              highlightClientId={vm.highlightClientId}
              highlightClientBirthDate={vm.highlightClient?.birthDate}
              slotSuggestions={vm.canEdit ? vm.allSuggestions : []}
              roomMode={vm.roomId ? "fixed" : "auto"}
              fixedRoomId={vm.roomId}
              readOnly={vm.readOnly}
              allowAttendance={vm.canMarkAttendance}
              allowAbsenceOnly={vm.absenceOnlyClicks}
              allowOpenAbsence={vm.canCreateAbsence}
              suggestionAllowPickSlot={!!vm.highlightStaffName && !vm.highlightEmployee}
              columnWidth={vm.columnWidth}
              onSlotAction={vm.canEdit || vm.canMarkAttendance || vm.canCreateAbsence ? vm.setDraft : () => {}}
              onMoveAppointment={
                vm.canEdit
                  ? (id, employeeId, startMin) => vm.moveAppt.mutate({ id, employeeId, startMin })
                  : () => {}
              }
              onOpenGroup={vm.canEdit || vm.canMarkAttendance ? vm.openGroup : () => {}}
              onJoinGroup={vm.canEdit ? vm.joinGroupFromCalendar : undefined}
            />

            {vm.canEdit && (
              <aside className="space-y-4">
                <AutoSlotPicker
                  serviceName={vm.highlightService ? formatServiceName(vm.highlightService) : undefined}
                  employeeName={vm.highlightStaffName}
                  clientName={vm.highlightClient?.fullName}
                  roomMode={vm.roomId ? "fixed" : "auto"}
                  suggestions={vm.suggestions}
                  onPick={vm.pickSuggestion}
                />
                {vm.loadQ.data && <LoadPanel items={vm.loadQ.data} />}
              </aside>
            )}
          </div>
        )}
      </div>

      {(vm.canEdit || vm.canMarkAttendance || vm.canCreateAbsence) && (
        <>
          <AppointmentPopover
            draft={vm.draft}
            clients={vm.clientsQ.data ?? []}
            services={vm.servicesQ.data ?? []}
            rooms={vm.roomsQ.data ?? []}
            employees={vm.employeesQ.data ?? []}
            appointments={vm.activeAppointments}
            diagnosticPeriods={vm.diagnosticPeriodsQ.data ?? []}
            absences={vm.absencesForDay}
            fixedRoomId={vm.roomId}
            allowEditSlot={vm.canEdit}
            allowAbsenceCreate={vm.canCreateAbsence}
            onRecordUndo={vm.pushUndo}
            onClose={() => {
              vm.setDraft(null);
              (document.activeElement as HTMLElement | null)?.blur();
            }}
            onSaved={vm.refresh}
            onOpenClientCard={
              canOpenClientCard
                ? (clientId) => {
                    setCardClientId(clientId);
                  }
                : undefined
            }
          />

          <ClientCardModal clientId={cardClientId} onClose={() => setCardClientId(null)} />

          {vm.canEdit && (
            <>
              <ClientSchedulePrintModal
                open={vm.printOpen}
                clients={vm.clientsQ.data ?? []}
                initialDate={vm.date}
                onClose={() => vm.setPrintOpen(false)}
              />

              <Modal open={vm.displaySettingsOpen} title="Отображение расписания" onClose={() => vm.setDisplaySettingsOpen(false)}>
                <ScheduleDisplaySettings
                  compact
                  preferences={vm.preferences}
                  onSave={vm.saveDisplayPreferences}
                />
              </Modal>
            </>
          )}
        </>
      )}

      <DaySchedulePrintModal
        open={vm.dayPrintOpen}
        initialDate={vm.date}
        employees={vm.employeesQ.data ?? []}
        onClose={() => vm.setDayPrintOpen(false)}
      />
    </>
  );
}
