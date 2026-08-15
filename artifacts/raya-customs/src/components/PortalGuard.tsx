import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { usePortalAuth } from '@/hooks/usePortalAuth';

/** Protects portal dashboard routes — requires valid non-expired session. */
export default function PortalGuard() {
  const { isAuthenticated, loading } = usePortalAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="animate-spin text-muted" size={24} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal" replace />;
  }

  return <Outlet />;
}
