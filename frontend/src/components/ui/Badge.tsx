import type { ReactNode } from 'react';
import type { EmailStatus } from '../../api/types';
import { Icon } from './Icon';

type Tone = 'orange' | 'green' | 'red' | 'grey';
const tones: Record<Tone, string> = {
  orange: 'bg-amber-soft text-amber border-amber/20',
  green: 'bg-accent-soft text-accent-dark border-accent/20',
  red: 'bg-danger-soft text-danger border-danger/20',
  grey: 'bg-paper text-muted border-line',
};

export function Pill({ tone, icon, children }: { tone: Tone; icon?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {icon && <Icon name="clock" size={12} />}
      {children}
    </span>
  );
}

const status: Record<EmailStatus, { tone: Tone; label: string }> = {
  scheduled: { tone: 'orange', label: 'Scheduled' },
  processing: { tone: 'orange', label: 'Sending' },
  sent: { tone: 'green', label: 'Sent' },
  failed: { tone: 'red', label: 'Failed' },
  cancelled: { tone: 'grey', label: 'Cancelled' },
};

export function StatusBadge({ status: s }: { status: EmailStatus }) {
  return <Pill tone={status[s].tone}>{status[s].label}</Pill>;
}
