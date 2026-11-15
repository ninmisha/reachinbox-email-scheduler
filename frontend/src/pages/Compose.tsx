import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { RichTextEditor } from '../components/RichTextEditor';
import { SendLaterPopover } from '../components/SendLaterPopover';
import { ArrowLeft, Clock, Paperclip, Upload } from '../components/ui/Icons';
import { useToast } from '../components/ui/Toast';
import { extractEmails } from '../lib/csv';
import { htmlToText } from '../lib/html';

const inputCls = 'w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted/70';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-1">
      <span className="w-20 shrink-0 text-sm text-muted">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </div>
  );
}

export default function Compose() {
  const navigate = useNavigate();
  const toast = useToast();
  const [senders, setSenders] = useState<string[]>([]);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [typed, setTyped] = useState('');
  const [fileName, setFileName] = useState('');
  const [subject, setSubject] = useState('');
  const [delaySeconds, setDelaySeconds] = useState('2');
  const [hourlyLimit, setHourlyLimit] = useState('100');
  const [html, setHtml] = useState('');
  const [popover, setPopover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.senders().then((s) => setSenders(s.map((x) => x.email))).catch(() => undefined);
  }, []);

  const addRecipients = (text: string) => {
    const { emails } = extractEmails(text);
    if (emails.length) setRecipients((prev) => [...new Set([...prev, ...emails])]);
  };
  const onTypedKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ' '].includes(e.key) && typed.trim()) {
      e.preventDefault();
      addRecipients(typed);
      setTyped('');
    }
  };
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addRecipients(await file.text());
    setFileName(file.name);
    e.target.value = '';
  };

  const schedule = async (when: Date) => {
    setError('');
    const all = [...new Set([...recipients, ...extractEmails(typed).emails])];
    if (!subject.trim()) return setError('Add a subject.'), setPopover(false);
    if (!htmlToText(html)) return setError('Write the email body.'), setPopover(false);
    if (all.length === 0) return setError('Add recipients or upload a CSV / text file with email addresses.'), setPopover(false);
    if (when.getTime() < Date.now() - 60_000) return setError('Pick a time in the future.');

    setSubmitting(true);
    try {
      const res = await api.schedule({
        subject: subject.trim(),
        body: html,
        recipients: all,
        startTime: when.toISOString(),
        delaySeconds: Math.max(0, Number(delaySeconds) || 0),
        hourlyLimit: Math.max(1, Number(hourlyLimit) || 1),
      });
      toast('success', `Scheduled ${res.count} emails`);
      navigate('/dashboard/scheduled');
    } catch (e) {
      setError((e as Error).message);
      setPopover(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-white px-4 sm:px-6">
      <header className="relative flex items-center justify-between border-b border-line py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Back" className="rounded-md p-1 hover:bg-paper">
            <ArrowLeft />
          </button>
          <h1 className="text-base font-semibold">Compose New Email</h1>
        </div>
        <div className="flex items-center gap-2">
          <label title="Upload lead list (.csv / .txt)" className="cursor-pointer rounded-md p-2 text-muted hover:bg-paper hover:text-ink">
            <Paperclip />
            <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={onFile} className="sr-only" aria-label="Upload lead list" />
          </label>
          <button onClick={() => setPopover((v) => !v)} aria-label="Send later" className="rounded-md p-2 text-muted hover:bg-paper hover:text-ink">
            <Clock />
          </button>
          <button
            onClick={() => setPopover((v) => !v)}
            className="rounded-full border border-accent px-4 py-1.5 text-sm font-semibold text-accent hover:bg-accent-soft"
          >
            Send Later
          </button>
          {popover && <SendLaterPopover loading={submitting} onCancel={() => setPopover(false)} onDone={schedule} />}
        </div>
      </header>

      <div className="mt-2">
        <Row label="From">
          <span className="rounded-full bg-paper px-3 py-1 text-xs font-medium">
            {senders.length ? `${senders[0]}${senders.length > 1 ? ` +${senders.length - 1} more senders` : ''}` : 'Ethereal senders'}
          </span>
        </Row>

        <Row label="To">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 py-1.5">
            {recipients.slice(0, 3).map((r) => (
              <span key={r} className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-dark">
                {r}
              </span>
            ))}
            {recipients.length > 3 && (
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-dark">+{recipients.length - 3}</span>
            )}
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={onTypedKey}
              onBlur={() => {
                addRecipients(typed);
                setTyped('');
              }}
              placeholder={recipients.length ? '' : 'recipient@example.com'}
              aria-label="Recipients"
              className={`${inputCls} min-w-40 flex-1`}
            />
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-accent">
            <Upload width={14} height={14} /> Upload list
            <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={onFile} className="sr-only" />
          </label>
        </Row>
        {recipients.length > 0 && (
          <p className="px-1 py-1 text-xs font-medium text-accent-dark">
            {recipients.length} email addresses detected{fileName && ` (last upload: ${fileName})`}
            <button onClick={() => setRecipients([])} className="ml-3 text-muted underline">
              Clear
            </button>
          </p>
        )}

        <Row label="Subject">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" aria-label="Subject" className={inputCls} />
        </Row>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-1 border-b border-line px-1 py-1">
          <label className="flex items-center gap-3 text-sm text-muted">
            Delay between 2 emails
            <input
              type="number"
              min={0}
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(e.target.value)}
              aria-label="Delay between emails in seconds"
              className="w-16 rounded-md bg-paper px-2 py-1 text-center text-sm text-ink"
            />
            <span className="text-xs">sec</span>
          </label>
          <label className="flex items-center gap-3 text-sm text-muted">
            Hourly Limit
            <input
              type="number"
              min={1}
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(e.target.value)}
              aria-label="Hourly limit per sender"
              className="w-20 rounded-md bg-paper px-2 py-1 text-center text-sm text-ink"
            />
          </label>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="mt-4 pb-10">
        <RichTextEditor onChange={setHtml} placeholder="Type Your Reply..." />
        <p className="mt-2 text-xs text-muted">
          Personalize with <code>{'{{name}}'}</code> and <code>{'{{email}}'}</code>. They are filled in for every recipient when the email is sent.
        </p>
      </div>
    </div>
  );
}
