
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-50">
        <div className="relative">
          <div className="size-14 rounded-full border-4 border-gray-200" />
          <div className="absolute inset-0 size-14 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="mb-4 text-6xl">🚫</div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Нет доступа</h2>
          <p className="text-gray-500">У вас нет прав для просмотра этой страницы</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
