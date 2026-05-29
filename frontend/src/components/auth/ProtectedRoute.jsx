import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { normalizeRoleFromJwt } from '../../lib/rbac';
import LoadingOverlay from '../ui/LoadingOverlay';

export default function ProtectedRoute() {
  const { isAuthenticated, booting, role } = useAuth();
  const location = useLocation();
  const normalized = normalizeRoleFromJwt(role);

  if (booting) return <LoadingOverlay show />;
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (normalized === 'CUSTOMER' && !location.pathname.startsWith('/portal')) {
    return <Navigate to="/portal" replace />;
  }

  return <Outlet />;
}
