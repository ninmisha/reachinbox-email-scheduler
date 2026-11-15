export interface Sender {
  id: number;
  email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
}

export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed' | 'cancelled';
export type EmailKind = 'scheduled' | 'sent';

/** Shape returned by the API and stored in Elasticsearch. */
export interface EmailDoc {
  id: string;
  userId: number;
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

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}
