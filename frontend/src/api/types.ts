export interface User {
  id: number;
  email: string;
  name: string;
  avatar: string | null;
}
export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed' | 'cancelled';
export type EmailKind = 'scheduled' | 'sent';

export interface EmailItem {
  id: string;
  senderEmail: string;
  toEmail: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  previewUrl: string | null;
  error: string | null;
}
export interface EmailList {
  items: EmailItem[];
  total: number;
}
export interface Counts {
  scheduled: number;
  sent: number;
  failed: number;
  cancelled: number;
}
export interface ScheduleRequest {
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delaySeconds: number;
  hourlyLimit: number;
}
export interface SlackStatus {
  connected: boolean;
  channel?: string;
  team?: string;
}

export interface SenderInfo {
  id: number;
  email: string;
}
