export function getAppointmentPopoverTitle(params: {
  isAbsenceMode: boolean;
  isAbsenceEdit: boolean;
  isDiagnosticBooking: boolean;
  attendanceOnly: boolean;
  isGroupEdit: boolean;
  isEdit: boolean;
}): string {
  const {
    isAbsenceMode,
    isAbsenceEdit,
    isDiagnosticBooking,
    attendanceOnly,
    isGroupEdit,
    isEdit,
  } = params;

  if (isAbsenceMode) {
    return isAbsenceEdit ? "Редактирование отсутствия" : "Отсутствие";
  }
  if (isDiagnosticBooking) return "Запись диагностики";
  if (attendanceOnly) {
    return isGroupEdit ? "Явка участников" : "Явка клиента";
  }
  if (isGroupEdit) return "Групповое занятие";
  if (isEdit) return "Редактирование записи";
  return "Новая запись";
}
