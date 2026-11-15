import { Spinner } from './Spinner';

interface Props {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyTitle: string;
  emptyHint: string;
}

/** Shared loading / error / empty states for any list. Returns null when there is data to show. */
export function StateMessage({ loading, error, empty, emptyTitle, emptyHint }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-24 text-muted">
        <Spinner /> Loading emails...
      </div>
    );
  }
  if (error) return <div className="py-20 text-center text-sm text-danger">Could not load emails: {error}</div>;
  if (empty) {
    return (
      <div className="py-24 text-center">
        <p className="font-semibold">{emptyTitle}</p>
        <p className="mt-1 text-sm text-muted">{emptyHint}</p>
      </div>
    );
  }
  return null;
}
