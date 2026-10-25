import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/** Страница входа — только для гостей. */
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="pest-login-screen">
        <div className="relative">
          <div className="size-14 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 size-14 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
