import { Client } from '@elastic/elasticsearch';
import { config } from './config';
import { EmailDoc, EmailKind } from './types';
import { statusesFor } from './repo';

export const es = new Client({ node: config.elasticsearchUrl });
const INDEX = 'emails';
let ready = false;

export async function initSearch(): Promise<void> {
  try {
    const exists = await es.indices.exists({ index: INDEX });
    if (!exists) {
      await es.indices.create({
        index: INDEX,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            userId: { type: 'integer' },
            senderEmail: { type: 'keyword' },
            toEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            previewUrl: { type: 'keyword', index: false },
            error: { type: 'text' },
          },
        },
      });
    }
    ready = true;
    console.log('[search] Elasticsearch ready');
  } catch (e) {
    ready = false;
    console.warn('[search] Elasticsearch unavailable, search disabled:', (e as Error).message);
  }
}

export async function indexEmail(doc: EmailDoc | null): Promise<void> {
  if (!doc || !ready) return;
  try {
    await es.index({ index: INDEX, id: doc.id, document: doc });
  } catch (e) {
    console.warn('[search] index failed:', (e as Error).message);
  }
}

export async function indexMany(docs: EmailDoc[]): Promise<void> {
  if (!ready || docs.length === 0) return;
  try {
    const operations = docs.flatMap((d) => [{ index: { _index: INDEX, _id: d.id } }, d]);
    await es.bulk({ operations, refresh: false });
  } catch (e) {
    console.warn('[search] bulk index failed:', (e as Error).message);
  }
}

export async function searchEmails(userId: number, kind: EmailKind, q: string, size = 100) {
  if (!ready) throw new Error('Search is unavailable (Elasticsearch is not reachable)');
  const res = await es.search<EmailDoc>({
    index: INDEX,
    size,
    sort: kind === 'scheduled' ? [{ scheduledAt: 'asc' }] : [{ scheduledAt: 'desc' }],
    query: {
      bool: {
        filter: [{ term: { userId } }, { terms: { status: statusesFor(kind) } }],
        must: [
          {
            bool: {
              should: [
                { multi_match: { query: q, fields: ['toEmail^2', 'subject^2', 'body', 'senderEmail'], fuzziness: 'AUTO' } },
                { wildcard: { 'toEmail.keyword': { value: `*${q.toLowerCase()}*` } } },
              ],
              minimum_should_match: 1,
            },
          },
        ],
      },
    },
  });
  const items = res.hits.hits.map((h) => h._source as EmailDoc);
  const total = typeof res.hits.total === 'number' ? res.hits.total : res.hits.total?.value ?? items.length;
  return { items, total };
}
