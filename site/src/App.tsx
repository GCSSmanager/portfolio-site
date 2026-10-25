import { Navigate, Route, Routes } from 'react-router-dom'
import { CrmLayout } from '@/layouts/CrmLayout'
import { AboutCrmPage } from '@/pages/crm/AboutCrmPage'
import { CrmCustomPage } from '@/pages/crm/CrmCustomPage'
import { CrmFreePage } from '@/pages/crm/CrmFreePage'
import { CrmIntegrationsPage } from '@/pages/crm/CrmIntegrationsPage'
import { LegalConsentPage } from '@/pages/legal/LegalConsentPage'
import { LegalPrivacyPage } from '@/pages/legal/LegalPrivacyPage'
import { KpPage } from '@/pages/crm/KpPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/crm/custom/" replace />} />

      <Route path="/crm" element={<Navigate to="/crm/custom/" replace />} />

      <Route element={<CrmLayout />}>
        <Route path="/crm/custom/" element={<CrmCustomPage />} />
        <Route path="/crm/free/" element={<CrmFreePage />} />
        <Route path="/crm/integrations/" element={<CrmIntegrationsPage />} />
        <Route path="/crm/about/" element={<AboutCrmPage />} />
      </Route>

      <Route path="/crm/kp/" element={<KpPage />} />

      <Route path="/legal/privacy/" element={<LegalPrivacyPage />} />
      <Route path="/legal/consent/" element={<LegalConsentPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
