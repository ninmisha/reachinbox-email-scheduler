export const formatDateTime = (iso: string | null): string =>
  iso
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
    : '-';

export function relativeFromNow(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'due now';
  const m = Math.round(diff / 60000);
  if (m < 1) return 'in under a minute';
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `in ${h}h ${m % 60}m`;
  return `in ${Math.round(h / 24)} days`;
}

/** Value for <input type="datetime-local"> in the user's local time. */
export function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Short label for list pills: "Sat, 9:10 AM" within a week, "Dec 3, 9:10 AM" otherwise. */
export function formatShort(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const near = Math.abs(d.getTime() - Date.now()) < 6 * 24 * 3600 * 1000;
  return new Intl.DateTimeFormat(
    undefined,
    near
      ? { weekday: 'short', hour: 'numeric', minute: '2-digit' }
      : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
  ).format(d);
}
