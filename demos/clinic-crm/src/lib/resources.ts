import { api } from "./api";

export const resources = {
  employees: {
    /** all=false — только активные; all=true — включая удалённых */
    list: (all = false) => api.get("/api/employees", { params: { all } }).then((r) => r.data),
    create: (data: unknown) => api.post("/api/employees", data).then((r) => r.data),
    update: (id: string, data: unknown) => api.patch(`/api/employees/${id}`, data).then((r) => r.data),
    remove: (id: string) => api.delete(`/api/employees/${id}`),
    saveShifts: (id: string, shifts: unknown) =>
      api.put(`/api/employees/${id}/work-shifts`, { shifts }).then((r) => r.data),
  },
  services: {
    list: (all = true) => api.get("/api/services", { params: { all } }).then((r) => r.data),
    create: (data: unknown) => api.post("/api/services", data).then((r) => r.data),
    update: (id: string, data: unknown) => api.patch(`/api/services/${id}`, data).then((r) => r.data),
    remove: (id: string) => api.delete(`/api/services/${id}`),
  },
  rooms: {
    list: (all = true) => api.get("/api/rooms", { params: { all } }).then((r) => r.data),
    create: (data: unknown) => api.post("/api/rooms", data).then((r) => r.data),
    update: (id: string, data: unknown) => api.patch(`/api/rooms/${id}`, data).then((r) => r.data),
    remove: (id: string) => api.delete(`/api/rooms/${id}`),
  },
  specialties: {
    list: () => api.get("/api/specialties").then((r) => r.data),
    create: (data: unknown) => api.post("/api/specialties", data).then((r) => r.data),
    update: (id: string, data: unknown) => api.patch(`/api/specialties/${id}`, data).then((r) => r.data),
    remove: (id: string) => api.delete(`/api/specialties/${id}`),
  },
  clients: {
    list: (all = true) => api.get("/api/clients", { params: { all } }).then((r) => r.data),
    analytics: (params: { startDate: string; endDate: string; clientId?: string; ageCategory?: string }) =>
      api.get("/api/clients/analytics", { params }).then((r) => r.data),
    card: (id: string) => api.get(`/api/clients/${id}/card`).then((r) => r.data),
    startCourse: (id: string, data?: { startedAt?: string }) =>
      api.post(`/api/clients/${id}/courses`, data ?? {}).then((r) => r.data),
    updateCourse: (
      id: string,
      courseId: string,
      data: { startedAt?: string; completedAt?: string | null },
    ) => api.patch(`/api/clients/${id}/courses/${courseId}`, data).then((r) => r.data),
    completeCourse: (id: string, courseId: string, data?: { completedAt?: string }) =>
      api.post(`/api/clients/${id}/courses/${courseId}/complete`, data ?? {}).then((r) => r.data),
    addCourseNote: (id: string, courseId: string, body: string) =>
      api.post(`/api/clients/${id}/courses/${courseId}/notes`, { body }).then((r) => r.data),
    updateCourseNote: (id: string, courseId: string, noteId: string, body: string) =>
      api.patch(`/api/clients/${id}/courses/${courseId}/notes/${noteId}`, { body }).then((r) => r.data),
    removeCourseNote: (id: string, courseId: string, noteId: string) =>
      api.delete(`/api/clients/${id}/courses/${courseId}/notes/${noteId}`),
    create: (data: unknown) => api.post("/api/clients", data).then((r) => r.data),
    update: (id: string, data: unknown) => api.patch(`/api/clients/${id}`, data).then((r) => r.data),
    remove: (id: string) => api.delete(`/api/clients/${id}`),
  },
  clientGroups: {
    list: () => api.get("/api/client-groups").then((r) => r.data),
    create: (data: unknown) => api.post("/api/client-groups", data).then((r) => r.data),
    update: (id: string, data: unknown) => api.patch(`/api/client-groups/${id}`, data).then((r) => r.data),
    remove: (id: string) => api.delete(`/api/client-groups/${id}`),
  },
  absences: {
    list: () => api.get("/api/absences").then((r) => r.data),
    create: (data: unknown) => api.post("/api/absences", data).then((r) => r.data),
    update: (id: string, data: unknown) => api.patch(`/api/absences/${id}`, data).then((r) => r.data),
    remove: (id: string) => api.delete(`/api/absences/${id}`),
  },
  diagnosticPeriods: {
    list: (params?: { date?: string }) => api.get("/api/diagnostic-periods", { params }).then((r) => r.data),
    participantStatus: (params: { startDate: string; endDate: string; excludePeriodId?: string }) =>
      api.get("/api/diagnostic-periods/participant-status", { params }).then((r) => r.data),
    slots: (id: string, date: string) =>
      api.get(`/api/diagnostic-periods/${id}/slots`, { params: { date } }).then((r) => r.data),
    addInterval: (id: string, data: { date: string; startMin: number }) =>
      api.post(`/api/diagnostic-periods/${id}/intervals`, data).then((r) => r.data),
    copyIntervals: (id: string, data: { date: string }) =>
      api.post(`/api/diagnostic-periods/${id}/intervals/copy`, data).then((r) => r.data),
    removeInterval: (id: string, params: { date: string; startMin: number }) =>
      api.delete(`/api/diagnostic-periods/${id}/intervals`, { params }),
    book: (id: string, data: { date: string; startMin: number; clientId: string; note?: string | null }) =>
      api.post(`/api/diagnostic-periods/${id}/book`, data).then((r) => r.data),
    unbook: (id: string, params: { date: string; startMin: number }) =>
      api.delete(`/api/diagnostic-periods/${id}/bookings`, { params }),
    create: (data: unknown) => api.post("/api/diagnostic-periods", data).then((r) => r.data),
    update: (id: string, data: unknown) => api.patch(`/api/diagnostic-periods/${id}`, data).then((r) => r.data),
    remove: (id: string) => api.delete(`/api/diagnostic-periods/${id}`),
  },
  settings: {
    clinicWorkDays: () => api.get("/api/settings/clinic-work-days").then((r) => r.data),
    saveClinicWorkDays: (days: unknown) =>
      api.put("/api/settings/clinic-work-days", { days }).then((r) => r.data),
    features: () =>
      api.get<{ diagnosticBookingMode: string }>("/api/settings/features").then((r) => r.data),
  },
  documentTemplates: {
    list: () => api.get("/api/document-templates").then((r) => r.data),
    create: (data: FormData) => api.post("/api/document-templates", data).then((r) => r.data),
    update: (id: string, data: unknown) => api.patch(`/api/document-templates/${id}`, data).then((r) => r.data),
    remove: (id: string) => api.delete(`/api/document-templates/${id}`),
    variables: () => api.get("/api/document-templates/variables").then((r) => r.data),
    createVariable: (data: unknown) => api.post("/api/document-templates/variables", data).then((r) => r.data),
    updateVariable: (id: string, data: unknown) =>
      api.patch(`/api/document-templates/variables/${id}`, data).then((r) => r.data),
    removeVariable: (id: string) => api.delete(`/api/document-templates/variables/${id}`),
    render: (data: Record<string, unknown>) =>
      api.post("/api/document-templates/render", data, { responseType: "blob" }),
  },
  documentRoute: {
    stages: () => api.get("/api/document-route/stages").then((r) => r.data),
    createStage: (data: unknown) => api.post("/api/document-route/stages", data).then((r) => r.data),
    updateStage: (id: string, data: unknown) =>
      api.patch(`/api/document-route/stages/${id}`, data).then((r) => r.data),
    reorderStages: (ids: string[]) =>
      api.put("/api/document-route/stages/reorder", { ids }).then((r) => r.data),
    removeStage: (id: string) => api.delete(`/api/document-route/stages/${id}`),
    board: (status: "active" | "finishing" | "completed" = "active") =>
      api.get("/api/document-route/board", { params: { status } }).then((r) => r.data),
    setCheck: (courseId: string, stageId: string, checked: boolean) =>
      api.put(`/api/document-route/courses/${courseId}/stages/${stageId}`, { checked }).then((r) => r.data),
  },
  users: {
    list: () => api.get("/api/users").then((r) => r.data),
    create: (data: unknown) => api.post("/api/users", data).then((r) => r.data),
    update: (id: string, data: unknown) => api.patch(`/api/users/${id}`, data).then((r) => r.data),
    resetPassword: (id: string, password: string) =>
      api.post(`/api/users/${id}/reset-password`, { password }).then((r) => r.data),
    remove: (id: string) => api.delete(`/api/users/${id}`),
  },
} as const;
