import { json } from '@sveltejs/kit';
import { env } from 'node:process';
import { complete, instructions, parseJson, validateVerdict } from '#lib/server/ai.ts';
import { providers, roles, type Provider, type Role } from '#lib/types.ts';
import type { RequestHandler } from '@sveltejs/kit';
export const POST: RequestHandler = async ({ request, url }) => {
  if (request.headers.get('origin') !== url.origin) return json({ error: 'Requests must come from this app.' }, { status: 403 });
  try {
    if (!request.headers.get('content-type')?.includes('application/json')) throw new Error('Expected JSON.');
    const raw = await request.text();
    if (raw.length > 150000) return json({ error: 'This request is too large. Export and start a smaller board.' }, { status: 413 });
    const body = JSON.parse(raw);
    const provider = body.provider as Provider, role = body.role as Role;
    if (!providers.includes(provider) || !roles.includes(role)) throw new Error('Invalid provider or action.');
    if (typeof body.goal !== 'string' || typeof body.context !== 'string' || typeof body.model !== 'string' || (body.key !== undefined && typeof body.key !== 'string')) throw new Error('Invalid request.');
    const key = body.key || env[`${provider.toUpperCase()}_API_KEY`] || '';
    const output = await complete({ provider, key, model: body.model, ollamaUrl: body.ollamaUrl || 'http://127.0.0.1:11434', system: instructions(role), prompt: JSON.stringify({ goal: body.goal, context: body.context }) });
    if (role === 'summary') return json({ summary: output });
    const parsed = parseJson(output);
    if (role === 'judge') return json({ verdict: validateVerdict(parsed) });
    const ideas = (parsed as { ideas?: unknown[] })?.ideas;
    if (!Array.isArray(ideas) || !ideas.length || ideas.length > 5 || !ideas.every(v => v && typeof v === 'object' && typeof (v as any).title === 'string' && (v as any).title.trim() && typeof (v as any).description === 'string')) throw new Error('The model returned invalid ideas. Please retry.');
    return json({ ideas: ideas.map(v => ({ title: (v as any).title.slice(0, 120), description: (v as any).description.slice(0, 4000) })) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Generation failed.';
    return json({ error: /timeout|abort/i.test(message) ? 'The model timed out. Try a smaller or faster model.' : /fetch failed/i.test(message) ? 'Could not reach the provider. For Ollama, make sure it is running locally.' : message }, { status: 400 });
  }
};
