import { Link } from 'react-router-dom';
import type { EmailItem } from '../api/types';
import { formatShort, relativeFromNow } from '../lib/format';
import { htmlToText } from '../lib/html';
import { StatusBadge } from './ui/Badge';
import { Clock } from './ui/Icons';

export function EmailRow({ email }: { email: EmailItem }) {
  const upcoming = email.status === 'scheduled' || email.status === 'processing';
  const when = upcoming ? email.scheduledAt : email.sentAt ?? email.scheduledAt;

  return (
    <Link
      to={`/email/${email.id}`}
      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line px-4 py-3 text-sm hover:bg-paper sm:px-6"
    >
      <span className="w-52 shrink-0 truncate">
        <span className="text-muted">To: </span>
        <span className="font-medium">{email.toEmail}</span>
      </span>

      {upcoming ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-soft px-2.5 py-0.5 text-xs font-semibold text-amber" title={relativeFromNow(email.scheduledAt)}>
          <Clock width={12} height={12} />
          {formatShort(email.scheduledAt)}
        </span>
      ) : (
        <span title={email.error ?? undefined} className="shrink-0">
          <StatusBadge status={email.status} />
        </span>
      )}

      <span className="min-w-0 flex-1 truncate">
        <span className="font-semibold">{email.subject}</span>
        <span className="text-muted"> - {htmlToText(email.body)}</span>
      </span>

      <span className="shrink-0 text-xs text-muted">
        {upcoming ? <StatusBadge status={email.status} /> : formatShort(when)}
      </span>
    </Link>
  );
}
