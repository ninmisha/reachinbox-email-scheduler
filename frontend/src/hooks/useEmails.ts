import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { Counts, EmailItem, EmailKind } from '../api/types';

const POLL_MS = 5000;

/** Lists emails for a tab; uses Elasticsearch search when `query` is set. Polls so status stays live. */
export function useEmails(kind: EmailKind, query: string) {
  const [items, setItems] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      const id = ++seq.current;
      if (!silent) setLoading(true);
      try {
        const res = query ? await api.searchEmails(kind, query) : await api.listEmails(kind);
        if (id === seq.current) {
          setItems(res.items);
          setError(null);
        }
      } catch (e) {
        if (id === seq.current) setError((e as Error).message);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    },
    [kind, query],
  );

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  return { items, loading, error, reload: () => load(true) };
}

export function useCounts() {
  const [counts, setCounts] = useState<Counts>({ scheduled: 0, sent: 0, failed: 0, cancelled: 0 });
  const load = useCallback(() => api.counts().then(setCounts).catch(() => undefined), []);
  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);
  return { counts, reloadCounts: load };
}
