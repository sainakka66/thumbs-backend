import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import AdminRoute from './components/auth/AdminRoute';
import PermissionRoute from './components/auth/PermissionRoute';
import PwaShell from './components/pwa/PwaShell';
import { PageSkeleton } from './components/ui/Skeleton';

// Route-based code splitting: each page becomes its own chunk, loaded on demand.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const SalesPage = lazy(() => import('./pages/SalesPage'));
const DeliveriesPage = lazy(() => import('./pages/DeliveriesPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const AdminPaymentsPage = lazy(() => import('./pages/admin/AdminPaymentsPage'));
const AdminFraudPage = lazy(() => import('./pages/admin/AdminFraudPage'));
const AuditPage = lazy(() => import('./pages/admin/AuditPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const CustomerPortalPage = lazy(() => import('./pages/CustomerPortalPage'));

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <AuthProvider>
      <ToastProvider>
        <PwaShell>
        <BrowserRouter>
          <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="portal" element={<CustomerPortalPage />} />
                <Route path="inventory" element={<InventoryPage />} />
                <Route path="sales" element={<SalesPage />} />
                <Route path="deliveries" element={<DeliveriesPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="payments" element={<PaymentsPage />} />
                <Route
                  path="reports"
                  element={
                    <PermissionRoute permission="reports.view">
                      <ReportsPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="notifications"
                  element={
                    <PermissionRoute permission="notifications.view">
                      <NotificationsPage />
                    </PermissionRoute>
                  }
                />
                <Route
                  path="users"
                  element={
                    <PermissionRoute permission="users.manage">
                      <UsersPage />
                    </PermissionRoute>
                  }
                />
              </Route>
              <Route element={<AdminRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="admin/payments" element={<AdminPaymentsPage />} />
                  <Route path="admin/fraud" element={<AdminFraudPage />} />
                  <Route
                    path="admin/audit"
                    element={
                      <PermissionRoute permission="audit.view" roles={['ADMIN']}>
                        <AuditPage />
                      </PermissionRoute>
                    }
                  />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
        </PwaShell>
      </ToastProvider>
    </AuthProvider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}
