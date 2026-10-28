import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { isDemo } from '@/lib/supabase';
import { isStaffRole } from '@/lib/types';
import { Skeleton } from './ui';

function FullPageLoader() {
  return (
    <div role="status" className="flex min-h-screen items-center justify-center bg-page">
      <span className="sr-only">Loading</span>
      <Skeleton className="size-12 rounded-xl" />
    </div>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { loading, me } = useAuth();
  const location = useLocation();
  if (isDemo) return <>{children}</>;
  if (loading) return <FullPageLoader />;
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

export function RequireStaff({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  if (isDemo || isStaffRole(me?.role)) return <>{children}</>;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-page px-4 text-center">
      <h1 className="text-2xl font-extrabold">Admin area</h1>
      <p className="max-w-sm text-sm text-ink-3">This page is only for faculty and admins. Ask the academy owner to give your account access.</p>
      <Link to="/" className="btn-primary mt-2">
        Go to my courses
      </Link>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-page px-4 text-center">
      <p className="text-sm font-bold text-brand">404</p>
      <h1 className="text-2xl font-extrabold">Page not found</h1>
      <p className="text-sm text-ink-3">The link may be old or mistyped.</p>
      <Link to="/" className="btn-primary mt-2">
        Go home
      </Link>
    </div>
  );
}
