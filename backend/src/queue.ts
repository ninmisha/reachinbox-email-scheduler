import { Queue } from 'bullmq';
import { redis } from './redis';

export const QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 24 * 3600, count: 5000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});

export interface EmailJobData {
  emailId: string;
}
