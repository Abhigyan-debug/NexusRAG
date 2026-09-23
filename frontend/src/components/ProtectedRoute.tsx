import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';

// Subscribe to the token itself (not the isAuthenticated function, whose identity never
// changes) so these guards re-render and redirect the moment the user signs in or out.
function useIsAuthenticated() {
  const token = useAuthStore((s) => s.token);
  const tokenExpiry = useAuthStore((s) => s.tokenExpiry);
  return !!token && !!tokenExpiry && Date.now() < tokenExpiry - 5 * 60 * 1000;
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

export function GuestRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useIsAuthenticated();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
