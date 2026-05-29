import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccess } from '../../lib/rbac';

export default function PermissionRoute({ permission, roles, children }) {
  const { role, permissions } = useAuth();
  const item = { permission, roles };
  if (!canAccess(permissions, role, item)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
