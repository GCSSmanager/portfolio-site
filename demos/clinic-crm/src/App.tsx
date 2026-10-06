import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout";
import { SchedulePage } from "./pages/SchedulePage";
import { DirectoriesPage } from "./pages/DirectoriesPage";
import { DiagnosticsPage } from "./pages/DiagnosticsPage";
import { DocumentRoutePage } from "./pages/DocumentRoutePage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { UsersPage } from "./pages/UsersPage";
import { ClientSchedulePage } from "./pages/ClientSchedulePage";
import { ClinicHoursPage } from "./pages/ClinicHoursPage";
import { RequireAuth } from "./components/auth/RequireAuth";
import { RequireRole } from "./components/auth/RequireRole";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<SchedulePage />} />
          <Route path="client-schedule" element={<RequireRole roles={["DIRECTOR", "ADMIN"]}><ClientSchedulePage /></RequireRole>} />
          <Route path="analytics" element={<RequireRole roles={["DIRECTOR", "ADMIN"]}><AnalyticsPage /></RequireRole>} />
          <Route path="diagnostics" element={<RequireRole roles={["DIRECTOR", "ADMIN"]}><DiagnosticsPage /></RequireRole>} />
          <Route
            path="document-route"
            element={
              <RequireRole roles={["DIRECTOR", "ADMIN", "SPECIALIST"]}>
                <DocumentRoutePage />
              </RequireRole>
            }
          />
          <Route
            path="documents"
            element={
              <RequireRole roles={["DIRECTOR", "ADMIN"]}>
                <DocumentsPage />
              </RequireRole>
            }
          />
          <Route path="directories" element={<RequireRole roles={["DIRECTOR", "ADMIN"]}><DirectoriesPage /></RequireRole>} />
          <Route path="users" element={<RequireRole roles={["DIRECTOR"]}><UsersPage /></RequireRole>} />
          <Route path="clinic-hours" element={<RequireRole roles={["DIRECTOR"]}><ClinicHoursPage /></RequireRole>} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
