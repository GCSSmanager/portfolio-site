export type UserRole = "DIRECTOR" | "ADMIN" | "SPECIALIST";

export function canManageUsers(role: UserRole) {
  return role === "DIRECTOR";
}

export function canManageClinicSettings(role: UserRole) {
  return role === "DIRECTOR";
}

export function canManageSchedule(role: UserRole) {
  return role === "DIRECTOR" || role === "ADMIN";
}

export function canManageDirectories(role: UserRole) {
  return role === "DIRECTOR" || role === "ADMIN";
}

export function canManageAbsences(role: UserRole) {
  return role === "DIRECTOR" || role === "ADMIN";
}

export function canManageClients(role: UserRole) {
  return role === "DIRECTOR" || role === "ADMIN";
}

export function canAccessClientCard(role: UserRole) {
  return role === "DIRECTOR" || role === "ADMIN" || role === "SPECIALIST";
}

export function canViewAnalytics(role: UserRole) {
  return role === "DIRECTOR" || role === "ADMIN";
}

export function canAccessDocumentRoute(role: UserRole) {
  return role === "DIRECTOR" || role === "ADMIN" || role === "SPECIALIST";
}

export function canManageDocumentRouteStages(role: UserRole) {
  return role === "DIRECTOR";
}

export function canAccessDocumentTemplates(role: UserRole) {
  return role === "DIRECTOR" || role === "ADMIN";
}

export function isSpecialist(role: UserRole) {
  return role === "SPECIALIST";
}

export const ROLE_LABELS: Record<UserRole, string> = {
  DIRECTOR: "Руководитель",
  ADMIN: "Админ",
  SPECIALIST: "Специалист",
};
