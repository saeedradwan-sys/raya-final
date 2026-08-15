import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { staffHasPermission } from '@/lib/staffAuth';

/**
 * Requires authenticated staff session.
 * Routes under /staff/accounting also require clearing:read (server JWT permissions).
 */
export default function StaffGuard() {
  const { isAuthenticated, loading, session } = useStaffAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="animate-spin text-muted" size={24} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/staff" replace />;
  }

  const needsClearing =
    location.pathname.startsWith('/staff/accounting') ||
    location.pathname.includes('/staff/accounting');

  if (needsClearing && !staffHasPermission(session, 'clearing:read')) {
    return <Navigate to="/staff" replace state={{ denied: 'clearing:read' }} />;
  }

  return <Outlet />;
}
