import { NavLink, useNavigate } from 'react-router-dom';
import type { Counts } from '../api/types';
import { useAuth } from '../hooks/useAuth';
import { SlackCard } from './SlackCard';
import { Button } from './ui/Button';

function Avatar({ name, src }: { name: string; src: string | null }) {
  return src ? (
    <img src={src} alt="" referrerPolicy="no-referrer" className="h-10 w-10 rounded-full object-cover" />
  ) : (
    <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft font-semibold text-accent-dark">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function Sidebar({ counts }: { counts: Counts }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-accent-soft text-accent-dark' : 'text-muted hover:bg-paper hover:text-ink'
    }`;

  return (
    <aside className="flex w-full shrink-0 flex-col gap-4 border-b border-line bg-white p-4 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="text-2xl font-extrabold tracking-tight">ONG</div>

      <div className="flex items-center gap-3 rounded-xl bg-paper p-2.5">
        <Avatar name={user.name} src={user.avatar} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
      </div>

      <Button variant="secondary" className="!border-accent !text-accent hover:!bg-accent-soft" onClick={() => navigate('/compose')}>
        Compose
      </Button>

      <nav className="space-y-1">
        <p className="px-3 pb-1 text-xs font-medium text-muted">Core</p>
        <NavLink to="/dashboard/scheduled" className={link}>
          Scheduled <span className="text-xs">{counts.scheduled}</span>
        </NavLink>
        <NavLink to="/dashboard/sent" className={link}>
          Sent <span className="text-xs">{counts.sent + counts.failed}</span>
        </NavLink>
      </nav>

      <div className="mt-auto space-y-3">
        <SlackCard />
        <Button variant="ghost" className="w-full" onClick={logout}>
          Log out
        </Button>
      </div>
    </aside>
  );
}
