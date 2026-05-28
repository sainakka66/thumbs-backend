import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import SalesPage from './pages/SalesPage';
import DeliveriesPage from './pages/DeliveriesPage';
import CustomersPage from './pages/CustomersPage';
import PaymentsPage from './pages/PaymentsPage';
import AdminRoute from './components/auth/AdminRoute';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminFraudPage from './pages/admin/AdminFraudPage';
import PwaShell from './components/pwa/PwaShell';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <PwaShell>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="sales" element={<SalesPage />} />
                <Route path="deliveries" element={<DeliveriesPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="payments" element={<PaymentsPage />} />
              </Route>
              <Route element={<AdminRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="admin/payments" element={<AdminPaymentsPage />} />
                  <Route path="admin/fraud" element={<AdminFraudPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        </PwaShell>
      </ToastProvider>
    </AuthProvider>
  );
}
