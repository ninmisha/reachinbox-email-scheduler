import { useMemo, useState } from 'react';
import { toLocalInputValue } from '../lib/format';
import { Button } from './ui/Button';

interface Props {
  loading: boolean;
  onCancel: () => void;
  onDone: (when: Date) => void;
}

const atTomorrow = (hour: number, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d;
};

export function SendLaterPopover({ loading, onCancel, onDone }: Props) {
  const presets = useMemo(
    () => [
      { label: 'In 1 minute', date: new Date(Date.now() + 60_000) },
      { label: 'Tomorrow, 10:00 AM', date: atTomorrow(10) },
      { label: 'Tomorrow, 1:00 PM', date: atTomorrow(13) },
    ],
    [],
  );
  const [picked, setPicked] = useState<Date | null>(null);
  const [custom, setCustom] = useState('');

  const choose = (d: Date) => {
    setPicked(d);
    setCustom(toLocalInputValue(d));
  };

  return (
    <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-xl border border-line bg-white p-4 shadow-xl">
      <p className="mb-3 text-sm font-semibold">Send later</p>
      <input
        type="datetime-local"
        value={custom}
        onChange={(e) => {
          setCustom(e.target.value);
          const d = new Date(e.target.value);
          setPicked(Number.isNaN(d.getTime()) ? null : d);
        }}
        aria-label="Pick date and time"
        className="mb-3 w-full rounded-lg border border-line px-3 py-2 text-sm"
      />
      <ul className="mb-4 space-y-1">
        {presets.map((p) => (
          <li key={p.label}>
            <button
              type="button"
              onClick={() => choose(p.date)}
              className={`w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent-soft ${
                picked?.getTime() === p.date.getTime() ? 'bg-accent-soft font-semibold text-accent-dark' : ''
              }`}
            >
              {p.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" className="!py-1.5" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" className="!py-1.5" disabled={!picked} loading={loading} onClick={() => picked && onDone(picked)}>
          Done
        </Button>
      </div>
    </div>
  );
}
