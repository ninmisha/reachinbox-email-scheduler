import { Navigate, useOutletContext, useParams } from 'react-router-dom';
import type { EmailKind } from '../api/types';
import type { LayoutContext } from '../components/AppLayout';
import { EmailRow } from '../components/EmailRow';
import { StateMessage } from '../components/ui/StateMessage';
import { useEmails } from '../hooks/useEmails';

export default function Inbox() {
  const { tab } = useParams();
  const { query } = useOutletContext<LayoutContext>();
  const kind: EmailKind = tab === 'sent' ? 'sent' : 'scheduled';
  const { items, loading, error } = useEmails(kind, query);

  if (tab !== 'scheduled' && tab !== 'sent') return <Navigate to="/dashboard/scheduled" replace />;

  const empty = query
    ? { title: 'No matches', hint: 'Try a different email address, subject or keyword.' }
    : kind === 'scheduled'
      ? { title: 'No scheduled emails', hint: 'Choose Compose to schedule your first campaign.' }
      : { title: 'No sent emails yet', hint: 'Emails appear here as soon as they are delivered.' };

  return (
    <section aria-label={kind === 'scheduled' ? 'Scheduled emails' : 'Sent emails'}>
      <StateMessage loading={loading} error={error} empty={items.length === 0} emptyTitle={empty.title} emptyHint={empty.hint} />
      {!loading && !error && items.map((e) => <EmailRow key={e.id} email={e} />)}
    </section>
  );
}
