import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { EmailItem } from '../api/types';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { StatusBadge } from '../components/ui/Badge';
import { ArrowLeft } from '../components/ui/Icons';
import { Spinner } from '../components/ui/Spinner';
import { formatDateTime } from '../lib/format';
import { sanitizeHtml } from '../lib/html';

export default function EmailDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState<EmailItem | null>(null);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const toast = useToast();

  const cancel = async () => {
    setCancelling(true);
    try {
      await api.cancel(id);
      toast('success', 'Email cancelled');
      navigate('/dashboard/scheduled');
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    api.getEmail(id).then(setEmail).catch((e: Error) => setError(e.message));
  }, [id]);

  return (
    <article className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft /> Back
      </button>
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      {!email && !error && (
        <div className="flex justify-center py-20 text-accent">
          <Spinner className="h-7 w-7" />
        </div>
      )}
      {email && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold">{email.subject}</h1>
            <StatusBadge status={email.status} />
          </div>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">From</dt>
            <dd>{email.senderEmail}</dd>
            <dt className="text-muted">To</dt>
            <dd>{email.toEmail}</dd>
            <dt className="text-muted">{email.sentAt ? 'Sent' : 'Scheduled'}</dt>
            <dd>{formatDateTime(email.sentAt ?? email.scheduledAt)}</dd>
          </dl>
          {email.status === 'scheduled' && (
            <Button variant="danger" className="mt-4" loading={cancelling} onClick={cancel}>
              Cancel this email
            </Button>
          )}
          {email.error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">Delivery error: {email.error}</p>}
          <div
            className="mt-6 space-y-3 border-t border-line pt-6 text-sm leading-relaxed [&_a]:text-accent [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(email.body) }}
          />
          {email.previewUrl && (
            <Link to={email.previewUrl} target="_blank" className="mt-6 inline-block text-sm font-medium text-accent underline">
              Open delivered message in Ethereal
            </Link>
          )}
        </>
      )}
    </article>
  );
}
