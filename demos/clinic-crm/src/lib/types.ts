export interface WorkShift {
  id?: string;
  weekday: number;
  startMin: number;
  endMin: number;
  lunchStartMin?: number | null;
  lunchEndMin?: number | null;
}

export interface ClinicWorkDay {
  id?: string;
  weekday: number;
  isOpen: boolean;
  startMin: number;
  endMin: number;
}

export interface Specialty {
  id: string;
  name: string;
  isActive: boolean;
}

export interface DocumentTemplate {
  id: string;
  title: string;
  fileName: string;
  sortOrder: number;
  createdAt: string;
}

export interface DocumentVariable {
  id: string;
  key: string;
  label: string;
  sortOrder: number;
}

export interface DocumentRouteStage {
  id: string;
  title: string;
  sortOrder: number;
  isActive: boolean;
}

export interface DocumentRouteCheck {
  stageId: string;
  title: string;
  checked: boolean;
  checkedAt: string | null;
  checkedByName: string | null;
}

export interface DocumentRouteBoardItem {
  courseId: string;
  clientId: string;
  clientName: string;
  startedAt: string;
  completedAt: string | null;
  isCompleted: boolean;
  checkedCount: number;
  stageCount: number;
  allChecked: boolean;
  checks: DocumentRouteCheck[];
}

export interface DocumentRouteBoard {
  stages: DocumentRouteStage[];
  items: DocumentRouteBoardItem[];
}

export interface Employee {
  id: string;
  fullName: string;
  shortName: string;
  position?: string | null;
  specialtyId?: string | null;
  specialty?: Specialty | null;
  color: string;
  isActive: boolean;
  /** false = не показывать колонку в общем расписании */
  showInCalendar?: boolean;
  defaultRoomId?: string | null;
  defaultRoom?: Room | null;
  workShifts?: WorkShift[];
}

export interface Service {
  id: string;
  name: string;
  durationMin: number;
  color: string;
  isGroup: boolean;
  isActive: boolean;
}

export interface Room {
  id: string;
  name: string;
  /** Одновременных занятий в кабинете (по умолчанию 1). */
  capacity: number;
  isActive: boolean;
}

export interface ClientGroup {
  id: string;
  name: string;
  _count?: { clients: number };
}

export interface Client {
  id: string;
  fullName: string;
  phone?: string | null;
  note?: string | null;
  birthDate?: string | null;
  ageCategory?: ClientAgeCategory | null;
  categories?: ClientCategory[];
  groupId?: string | null;
  /** false = уже обращался до CRM; true = первичный. */
  isPrimary?: boolean;
  isActive: boolean;
  group?: ClientGroup | null;
}

export interface ClientCourseNote {
  id: string;
  courseId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  authorUserId: string;
  authorName: string;
  authorUsername: string;
}

export interface ClientCourse {
  id: string;
  clientId: string;
  startedAt: string;
  completedAt: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  notes: ClientCourseNote[];
}

export interface ClientCardResponse {
  client: Client;
  courses: ClientCourse[];
  activeCourse: ClientCourse | null;
}

export type ClientAgeCategory = "ADULT" | "CHILD";
export type ClientCategory = "DISABILITY_1" | "DISABILITY_2" | "DISABILITY_3" | "CHILD_DISABILITY" | "OJD" | "OVZ";

export type AbsenceType = "SICK" | "BUSINESS_TRIP" | "VACATION" | "DAY_OFF" | "OTHER";

export interface Absence {
  id: string;
  employeeId: string;
  type: AbsenceType;
  startDate: string;
  endDate: string;
  startMin?: number | null;
  endMin?: number | null;
  note?: string | null;
  employee?: { id: string; shortName: string };
}

export type GroupAgeRange = "AGE_1_3" | "AGE_4_7" | "AGE_8_11" | "AGE_12_15" | "AGE_16_18";

export interface Appointment {
  id: string;
  date: string;
  startMin: number;
  endMin: number;
  status: "PLANNED" | "DONE" | "CANCELLED";
  clientNoShow?: boolean | null;
  note?: string;
  groupSessionId?: string | null;
  groupAgeRange?: GroupAgeRange | null;
  coStaffSessionId?: string | null;
  diagnosticPeriodId?: string | null;
  client: { id: string; fullName: string };
  employee: { id: string; shortName: string; color: string };
  service: { id: string; name: string; color: string; isGroup: boolean };
  room?: { id: string; name: string; capacity?: number } | null;
}

export interface DiagnosticPeriodInterval {
  id: string;
  date: string;
  startMin: number;
}

export interface DiagnosticPeriod {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  note?: string | null;
  roomId: string;
  durationMin: number;
  room?: { id: string; name: string; capacity?: number };
  participants: { employeeId: string; employee: Employee }[];
  /** Окна дня (приходят в list(?date=)). */
  intervals?: DiagnosticPeriodInterval[];
}

export interface DiagnosticSlot {
  id?: string;
  startMin: number;
  endMin: number;
  free: boolean;
  clientId: string | null;
  clientName: string | null;
  coStaffSessionId: string | null;
  appointmentId: string | null;
}

export interface DiagnosticIntervalStartOption {
  startMin: number;
  endMin: number;
  available: boolean;
  shortLabel: string;
}

export interface DiagnosticDaySlots {
  date: string;
  durationMin: number;
  startOptions?: DiagnosticIntervalStartOption[];
  slots: DiagnosticSlot[];
}

export interface DiagnosticPeriodParticipantStatus {
  employeeId: string;
  shortName: string;
  available: boolean;
  shortLabel: string;
  detail?: string;
}

export interface EmployeeAnalyticsItem {
  employeeId: string;
  shortName: string;
  fullName: string;
  position?: string | null;
  color: string;
  workDays: number;
  workMinutes: number;
  availableMinutes: number;
  busyMinutes: number;
  appointmentMinutes: number;
  diagnosticMinutes: number;
  absenceMinutes: number;
  freeMinutes: number;
  overloadDays: number;
  utilization: number;
  avgBusyMinutesPerWorkDay: number;
  avgBusyMinutesPerMonth: number;
  days: { date: string; workMinutes: number; busyMinutes: number; freeMinutes: number; utilization: number; overload: boolean }[];
}

export interface EmployeeAnalyticsResponse {
  startDate: string;
  endDate: string;
  days: number;
  totals: {
    workMinutes: number;
    availableMinutes: number;
    busyMinutes: number;
    freeMinutes: number;
    overloadDays: number;
    workDays: number;
    utilization: number;
    avgBusyMinutesPerWorkDay: number;
    avgBusyMinutesPerMonth: number;
  };
  items: EmployeeAnalyticsItem[];
}

export interface ClientAnalyticsItem {
  clientId: string;
  fullName: string;
  ageCategory?: ClientAgeCategory | null;
  categories: ClientCategory[];
  groupName?: string | null;
  isPrimary?: boolean;
  appointmentCount: number;
  visitCount: number;
  visitMinutes: number;
  noShowCount: number;
  lastVisitDate?: string | null;
  firstVisitDate?: string | null;
  /** Первичный = первый визит в выбранном периоде; повторный = были визиты раньше. */
  visitKind?: "primary" | "returning" | null;
  topService?: string | null;
  activeInPeriod: boolean;
}

export interface ClientAnalyticsMonth {
  month: string;
  uniqueClients: number;
  primaryClients: number;
  returningClients: number;
  visitCount: number;
}

export interface ClientAnalyticsResponse {
  startDate: string;
  endDate: string;
  days: number;
  totals: {
    activeClients: number;
    clientsWithVisits: number;
    clientsWithoutVisits: number;
    primaryClients: number;
    returningClients: number;
    appointmentCount: number;
    visitCount: number;
    visitMinutes: number;
    noShowCount: number;
  };
  byAge: { ADULT: number; CHILD: number; unset: number };
  byCategory: Record<ClientCategory, number>;
  byMonth: ClientAnalyticsMonth[];
  items: ClientAnalyticsItem[];
}

export interface ClientHistoryResponse {
  client: Client & { group?: (ClientGroup & { clients: Client[] }) | null };
  appointments: Appointment[];
  courses: ClientCourse[];
}

export interface ClientScheduleEntry {
  id: string;
  date: string;
  startMin: number;
  endMin: number;
  title: string;
  clientName: string;
  specialist: string;
  room?: string | null;
  kind: "appointment" | "absence";
  employeeId?: string;
  serviceId?: string;
  isGroup?: boolean;
  groupSessionId?: string | null;
  coStaffSessionId?: string | null;
  groupSize?: number;
}

export interface ClientScheduleResponse {
  client: Client & { group?: (ClientGroup & { clients: Client[] }) | null };
  clients: Client[];
  isGroupSchedule: boolean;
  entries: ClientScheduleEntry[];
}
