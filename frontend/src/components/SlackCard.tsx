import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { SlackStatus } from '../api/types';
import { Button } from './ui/Button';
import { useToast } from './ui/Toast';

/** Connect Slack (real OAuth) so rate-limit hits are posted to a channel. */
export function SlackCard() {
  const toast = useToast();
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.slackStatus().then(setStatus).catch(() => setStatus({ connected: false })), []);
  useEffect(() => {
    load();
    const flag = new URLSearchParams(window.location.search).get('slack');
    if (flag) {
      if (flag === 'connected') toast('success', 'Slack connected. Rate-limit alerts will post to your channel.');
      else toast('error', 'Could not connect Slack. Try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [load, toast]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast('error', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const connect = () =>
    run(async () => {
      const { url } = await api.slackConnectUrl();
      window.location.href = url;
    });
  const test = () =>
    run(async () => {
      await api.slackTest();
      toast('success', 'Test message sent to Slack');
    });
  const disconnect = () =>
    run(async () => {
      await api.slackDisconnect();
      await load();
      toast('success', 'Slack disconnected');
    });

  if (!status) return null;
  return (
    <div className="space-y-2 rounded-xl border border-line p-3">
      <p className="text-sm font-semibold">Slack alerts</p>
      <p className="text-xs text-muted">
        {status.connected
          ? `Posting to ${status.channel ?? 'your channel'} when a sender hits its hourly limit.`
          : 'Get a Slack message when a sender hits its hourly limit.'}
      </p>
      {status.connected ? (
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 !px-2 !py-1.5 text-xs" onClick={test} disabled={busy}>
            Send test
          </Button>
          <Button variant="danger" className="flex-1 !px-2 !py-1.5 text-xs" onClick={disconnect} disabled={busy}>
            Disconnect
          </Button>
        </div>
      ) : (
        <Button className="w-full !py-1.5 text-xs" onClick={connect} loading={busy}>
          Connect Slack
        </Button>
      )}
    </div>
  );
}
