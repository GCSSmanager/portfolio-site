import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { DemoShell, pestDemoShell } from '@/demo-shell';
import { DemoAppChrome } from '@/components/demo/DemoAppChrome';
import { AppLayout } from '@/components/layout/AppLayout';
import { GuestRoute } from '@/components/Auth/GuestRoute';
import { AuthSessionSync } from '@/components/Auth/AuthSessionSync';
import LoginPage from '@/app/login/page';
import DashboardPage from '@/app/page';
import StatisticsPage from '@/app/statistics/page';
import TasksPage from '@/app/tasks/page';
import DistributionPage from '@/app/distribution/page';
import CallsPage from '@/app/calls/page';
import ActivityPage from '@/app/activity/page';
import MasterHistoryPage from '@/app/master-history/page';

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AuthSessionSync />
        <DemoShell config={pestDemoShell}>
          <DemoAppChrome>
            <Routes>
              <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="statistics" element={<StatisticsPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="distribution" element={<DistributionPage />} />
                <Route path="calls" element={<CallsPage />} />
                <Route path="activity" element={<ActivityPage />} />
                <Route path="master-history" element={<MasterHistoryPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </DemoAppChrome>
        </DemoShell>
      </AuthProvider>
    </HashRouter>
  );
}
