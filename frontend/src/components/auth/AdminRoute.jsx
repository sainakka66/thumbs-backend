import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingOverlay from '../ui/LoadingOverlay';

export default function AdminRoute() {
  const { isAuthenticated, booting, role } = useAuth();

  if (booting) return <LoadingOverlay message="Loading…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role !== 'ADMIN' && role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
