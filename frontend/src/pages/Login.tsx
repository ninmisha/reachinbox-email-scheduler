import { Navigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center text-accent">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard/scheduled" replace />;

  return (
    <main className="grid min-h-screen place-items-center bg-white px-4">
      <div className="w-full max-w-sm rounded-xl border border-line p-8">
        <h1 className="text-center text-2xl font-bold">Login</h1>
        {params.get('error') && (
          <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">Google sign-in failed. Try again.</p>
        )}
        <a
          href={api.loginUrl}
          className="mt-6 flex items-center justify-center gap-3 rounded-lg bg-accent-soft px-4 py-2.5 text-sm font-semibold text-ink hover:brightness-95"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.1 5.5c4.3-4 6.8-9.9 6.8-16.9z" />
            <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.1-5.5c-2 1.4-4.6 2.2-8.8 2.2-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
          Login with Google
        </a>
        <p className="mt-4 text-center text-xs text-muted">Sign in with your Google account to continue.</p>
      </div>
    </main>
  );
}
