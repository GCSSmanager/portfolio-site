import { HashRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { AuthSessionSync } from './auth/AuthSessionSync'
import { DemoLoginPage } from './auth/DemoLoginPage'
import { LoginPage } from './auth/LoginPage'
import { OwnerFeaturesOutlet } from './auth/OwnerFeaturesOutlet'
import { ProtectedLayout } from './auth/ProtectedLayout'
import { FlowersCatalog } from './pages/FlowersCatalog'
import { RootIndex } from './pages/RootIndex'
import { PricesPage } from './pages/PricesPage'
import { SuppliersPage } from './pages/SuppliersPage'
import { DeliveryServicesPage } from './pages/DeliveryServicesPage'
import { StaffPage } from './pages/StaffPage'
import { StatisticsPage } from './pages/StatisticsPage'
import { WarehousePage } from './pages/WarehousePage'
import { WarehouseFlowersPage } from './pages/WarehouseFlowersPage'
import { StoreFlowerCarePage } from './pages/StoreFlowerCarePage'
import { StockCrm } from './pages/StockCrm'
import { WarehouseInventoryPage } from './pages/warehouse/WarehouseInventoryPage'
import { NotFound } from './pages/NotFound'
import { ServiceUnavailablePage } from './pages/ServiceUnavailable'
import { SubscriptionRequiredPage } from './pages/SubscriptionRequiredPage'
import { TaxonCareDetail } from './pages/TaxonCareDetail'
import { ExpensesPage } from './pages/ExpensesPage'
import { SalesPage } from './pages/SalesPage'
import { SettingsPage } from './pages/SettingsPage'
import { SubscriptionPage } from './pages/SubscriptionPage'
import { TasksPage } from './pages/TasksPage'
import { CustomerShopCatalogPage } from './pages/CustomerShopCatalogPage'

const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AuthSessionSync />
        <Routes>
          <Route path="/login" element={isDemo ? <DemoLoginPage /> : <LoginPage />} />
          <Route path="/service-unavailable" element={<ServiceUnavailablePage />} />
          <Route path="/subscription-required" element={<SubscriptionRequiredPage />} />
          <Route path="/" element={<RootIndex />} />
          <Route path="/shops/:shopId" element={<CustomerShopCatalogPage />} />
          <Route element={<ProtectedLayout />}>
            <Route element={<OwnerFeaturesOutlet />}>
              <Route path="statistics" element={<StatisticsPage />} />
              <Route path="prices" element={<PricesPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="delivery-services" element={<DeliveryServicesPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="subscription" element={<SubscriptionPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="tasks" element={<TasksPage />} />
            </Route>
            <Route path="warehouse" element={<WarehousePage />}>
              <Route index element={<StockCrm surface="warehouse" />} />
              <Route path="flowers" element={<WarehouseFlowersPage />} />
              <Route path="flowers/:id" element={<StoreFlowerCarePage />} />
              <Route path="inventory" element={<WarehouseInventoryPage />} />
            </Route>
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="catalog" element={<FlowersCatalog />} />
            <Route path="flowers/:id" element={<TaxonCareDetail />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}
