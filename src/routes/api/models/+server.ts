import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from 'node:process';
import { listModels } from '#lib/server/models.ts';
import { providers } from '#lib/types.ts';
export const POST: RequestHandler = async ({ request, url }) => {
  const options = { headers: { 'Cache-Control': 'no-store' } };
  if (request.headers.get('origin') !== url.origin) return json({ error: 'Requests must come from this app.' }, { ...options, status: 403 });
  let body;
  try {
    if (!request.headers.get('content-type')?.includes('application/json')) throw new Error();
    const raw = await request.text();
    if (raw.length > 12000) throw new Error();
    body = JSON.parse(raw);
    if (!body || !providers.includes(body.provider) || (body.key !== undefined && (typeof body.key !== 'string' || body.key.length > 8000)) || (body.ollamaUrl !== undefined && typeof body.ollamaUrl !== 'string')) throw new Error();
  } catch { return json({ error: 'Invalid model-list request.' }, { ...options, status: 400 }); }
  try {
    const models = await listModels({ provider: body.provider, key: body.key?.trim() || env[`${body.provider.toUpperCase()}_API_KEY`] || '', ollamaUrl: body.ollamaUrl || 'http://127.0.0.1:11434' });
    return json({ models }, options);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Could not load models.' }, { ...options, status: 400 });
  }
};
