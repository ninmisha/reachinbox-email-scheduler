import type { Counts, EmailItem, EmailKind, EmailList, ScheduleRequest, SenderInfo, SlackStatus, User } from './types';

export const BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let message = res.statusText || 'Request failed';
    try {
      message = (await res.json()).error ?? message;
    } catch {
      /* body was not JSON */
    }
    throw new ApiError(res.status, message);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  me: () => request<User>('/api/me'),
  logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
  login: (email: string, password: string) =>
    request<{ ok: boolean }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  loginUrl: `${BASE}/auth/google`,
  listEmails: (status: EmailKind) => request<EmailList>(`/api/emails?status=${status}&limit=200`),
  searchEmails: (status: EmailKind, q: string) =>
    request<EmailList>(`/api/emails/search?status=${status}&q=${encodeURIComponent(q)}`),
  getEmail: (id: string) => request<EmailItem>(`/api/emails/${id}`),
  cancel: (id: string) => request<{ ok: boolean }>(`/api/emails/${id}/cancel`, { method: 'POST' }),
  senders: () => request<SenderInfo[]>('/api/emails/senders'),
  counts: () => request<Counts>('/api/emails/counts'),
  schedule: (body: ScheduleRequest) =>
    request<{ count: number }>('/api/emails/schedule', { method: 'POST', body: JSON.stringify(body) }),
  slackStatus: () => request<SlackStatus>('/api/slack'),
  slackConnectUrl: () => request<{ url: string }>('/api/slack/connect-url'),
  slackTest: () => request<{ ok: boolean }>('/api/slack/test', { method: 'POST' }),
  slackDisconnect: () => request<void>('/api/slack', { method: 'DELETE' }),
};
