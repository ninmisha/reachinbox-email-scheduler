import { redis } from './redis';
import { config } from './config';

/**
 * Atomic "increment only if under limit" so concurrent workers / instances
 * can never overshoot. Key = sender + window start, so each window starts at 0.
 */
const ACQUIRE_LUA = `
local c = tonumber(redis.call('GET', KEYS[1]) or '0')
if c >= tonumber(ARGV[1]) then return {0, c} end
c = redis.call('INCR', KEYS[1])
if c == 1 then redis.call('PEXPIRE', KEYS[1], tonumber(ARGV[2])) end
return {1, c}
`;

export interface Acquire {
  allowed: boolean;
  count: number;
  windowStart: number;
  nextWindowStart: number;
  key: string;
}

export async function tryAcquire(senderId: number, limit: number, now = Date.now()): Promise<Acquire> {
  const { windowMs } = config.rate;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = `rl:sender:${senderId}:${windowStart}`;
  const [ok, count] = (await redis.eval(ACQUIRE_LUA, 1, key, limit, windowMs * 2)) as [number, number];
  return { allowed: ok === 1, count, windowStart, nextWindowStart: windowStart + windowMs, key };
}

/** Give the slot back when the send itself failed (nothing was delivered). */
export async function release(key: string): Promise<void> {
  const v = await redis.decr(key);
  if (v < 0) await redis.set(key, 0, 'PX', config.rate.windowMs);
}

/** True only the first time per sender per window, so Slack gets one alert, not hundreds. */
export async function firstNotifyInWindow(senderId: number, windowStart: number): Promise<boolean> {
  const res = await redis.set(`rl:notified:${senderId}:${windowStart}`, '1', 'PX', config.rate.windowMs * 2, 'NX');
  return res === 'OK';
}
