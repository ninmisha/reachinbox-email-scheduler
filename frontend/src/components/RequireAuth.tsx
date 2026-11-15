import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Spinner } from './ui/Spinner';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-accent">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  return user ? <>{children}</> : <Navigate to="/" replace />;
}
