// Schedules N emails at once to show behaviour under load + rate limiting.
// Needs DEV_API_KEY set in backend/.env.  Usage: npm run load-test -- 1200
import 'dotenv/config';

const N = Number(process.argv[2] ?? 1000);
const API = process.env.BACKEND_URL ?? 'http://localhost:4000';
const key = process.env.DEV_API_KEY;
if (!key) throw new Error('Set DEV_API_KEY in .env to use the load test');

async function main() {
  const recipients = Array.from({ length: N }, (_, i) => `lead${i}@example.com`);
  const res = await fetch(`${API}/api/emails/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key! },
    body: JSON.stringify({
      subject: 'Load test',
      body: 'Hello from the load test',
      recipients,
      startTime: new Date(Date.now() + 5000).toISOString(),
      delaySeconds: 0, // ALL emails due at the same moment
      hourlyLimit: 5, // tiny limit so the rate limiter + Slack alert kick in fast
    }),
  });
  console.log(res.status, await res.json());
}
main();
