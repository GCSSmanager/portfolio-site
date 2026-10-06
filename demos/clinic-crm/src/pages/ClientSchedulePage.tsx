import { format, parseISO } from "date-fns";
import { ClientScheduleToolbar } from "../components/client-schedule-toolbar";
import { ClientScheduleDisplaySettings } from "../components/ClientScheduleDisplaySettings";
import { ClientScheduleTimeGrid } from "../components/client-schedule/ClientScheduleTimeGrid";
import { JoinableGroupsPanel } from "../components/client-schedule/JoinableGroupsPanel";
import { AutoSlotPicker } from "../components/AutoSlotPicker";
import { useState } from "react";
import { AppointmentPopover } from "../components/appointment-popover";
import { ClientCardModal } from "../components/ClientCardModal";
import { ClientSchedulePrintModal } from "../components/ClientSchedulePrintModal";
import { Modal } from "../components/ui";
import { formatServiceName } from "../lib/service-label";
import { useClientSchedulePage } from "../hooks/useClientSchedulePage";
import { canAccessClientCard } from "../lib/roles";
import { useAuth } from "../components/auth/AuthProvider";

export function ClientSchedulePage() {
  const vm = useClientSchedulePage();
  const { user } = useAuth();
  const [cardClientId, setCardClientId] = useState<string | null>(null);
  const canOpenClientCard = user ? canAccessClientCard(user.role) : false;

  return (
    <>
      <ClientScheduleToolbar
        clientId={vm.clientId}
        onClientChange={vm.setClientId}
        clients={vm.clientsQ.data ?? []}
        startDate={vm.startDate}
        endDate={vm.endDate}
        onStartDateChange={vm.setStartDate}
        onEndDateChange={vm.setEndDate}
        onResetRange={vm.resetRange}
        onPrint={vm.clientId ? () => vm.setPrintOpen(true) : undefined}
        onOpenDisplaySettings={() => vm.setDisplaySettingsOpen(true)}
        totalEntries={vm.scheduleQ.data?.entries.length ?? 0}
        services={vm.servicesQ.data ?? []}
        highlightServiceId={vm.highlightServiceId}
        onHighlightService={vm.setHighlightServiceId}
        roomId={vm.roomId}
        onRoomChange={vm.setRoomId}
        rooms={vm.roomsQ.data ?? []}
        employees={vm.employeesQ.data ?? []}
        specialties={vm.specialtiesQ.data ?? []}
        employeeId={vm.employeeId}
        onEmployeeChange={vm.setEmployeeId}
        clientName={vm.selectedClient?.fullName}
      />

      <div className="p-4 sm:p-6">
        {!vm.clientId && (
          <div className="rounded-2xl border border-dashed border-line bg-surface/40 px-4 py-12 text-center text-sm text-ink-muted sm:px-6 sm:py-16">
            Выберите клиента, чтобы увидеть расписание по дням.
          </div>
        )}

        {vm.clientId && vm.loading && (
          <div className="flex items-center justify-center gap-3 py-12 text-sm text-ink-muted">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            Загрузка расписания…
          </div>
        )}

        {vm.clientId && !vm.loading && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_260px]">
            <ClientScheduleTimeGrid
              days={vm.dayDates}
              clientId={vm.clientId}
              clientBirthDate={vm.selectedClient?.birthDate}
              activeDay={vm.activeDay}
              appointmentsByDate={vm.appointmentsByDate}
              diagnosticPeriodsByDate={vm.diagnosticPeriodsByDate}
              absences={vm.absencesQ.data ?? []}
              employees={vm.employeesQ.data ?? []}
              rooms={vm.roomsQ.data ?? []}
              clinicDays={vm.clinicDaysQ.data ?? []}
              highlightService={vm.highlightService}
              employeeId={vm.employeeId}
              roomId={vm.roomId}
              onSelectDay={vm.selectDay}
              onAdd={vm.openAdd}
              onPickSuggestion={vm.pickSuggestion}
              onJoinGroup={vm.joinGroupFromCalendar}
              onMoveAppointment={vm.handleMoveAppointment}
              onPasteAppointment={(payload) => vm.duplicateAppt.mutate(payload)}
              onEditAppointment={vm.openAppointment}
              onEditGroup={vm.openGroup}
              onUndo={vm.undoLastAction}
              slotWidth={vm.displayPreferences.slotWidth}
            />

            <aside className="space-y-4 xl:sticky xl:top-28 xl:self-start">
              <JoinableGroupsPanel
                groups={vm.activeJoinableGroups}
                onJoin={(group) => vm.joinGroup(group, vm.activeDay)}
              />
              <AutoSlotPicker
                serviceName={vm.highlightService ? formatServiceName(vm.highlightService) : undefined}
                employeeName={vm.highlightStaffName}
                dateLabel={vm.activeDay ? format(parseISO(vm.activeDay), "d MMMM yyyy") : undefined}
                roomMode={vm.roomId ? "fixed" : "auto"}
                showEmployee={!!vm.employeeId}
                suggestions={vm.suggestions}
                onPick={(suggestion) => vm.pickSuggestion(suggestion, vm.activeDay)}
              />
            </aside>
          </div>
        )}
      </div>

      <AppointmentPopover
        draft={vm.draft}
        clients={vm.clientsQ.data ?? []}
        services={vm.servicesQ.data ?? []}
        rooms={vm.roomsQ.data ?? []}
        employees={vm.employeesQ.data ?? []}
        appointments={vm.draft ? (vm.appointmentsByDate.get(vm.draft.date) ?? []) : []}
        diagnosticPeriods={vm.draft ? (vm.draftDiagnosticPeriodsQ.data ?? []) : []}
        absences={vm.draft ? vm.absencesForDate(vm.draft.date) : []}
        fixedClientId={vm.draft?.clientId}
        fixedRoomId={vm.roomId}
        allowEditSlot={
          !vm.draft?.appointment?.diagnosticPeriodId &&
          !vm.draft?.groupMembers?.some((member) => member.diagnosticPeriodId)
        }
        onClose={() => {
          vm.setDraft(null);
          (document.activeElement as HTMLElement | null)?.blur();
        }}
        onSaved={vm.refresh}
        onRecordUndo={vm.pushUndo}
        onOpenClientCard={canOpenClientCard ? setCardClientId : undefined}
      />

      <ClientCardModal clientId={cardClientId} onClose={() => setCardClientId(null)} />

      <ClientSchedulePrintModal
        open={vm.printOpen}
        clients={vm.clientsQ.data ?? []}
        initialDate={vm.startDate}
        initialClientId={vm.clientId}
        initialStartDate={vm.startDate}
        initialEndDate={vm.endDate}
        lockClient
        onClose={() => vm.setPrintOpen(false)}
      />

      <Modal
        open={vm.displaySettingsOpen}
        title="Отображение расписания клиента"
        onClose={() => vm.setDisplaySettingsOpen(false)}
      >
        <ClientScheduleDisplaySettings
          compact
          preferences={vm.displayPreferences}
          onSave={vm.saveDisplayPreferences}
        />
      </Modal>
    </>
  );
}
