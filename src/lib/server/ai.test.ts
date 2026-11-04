import { describe, expect, it, vi } from 'vitest';
import { complete, ollamaBase, parseJson, validateVerdict } from './ai';
import { medal } from '../types';
describe('provider boundaries', () => {
  it('accepts only local Ollama endpoints', () => {
    expect(ollamaBase('http://localhost:11434')).toBe('http://localhost:11434');
    for (const url of ['https://example.com', 'http://127.0.0.1.evil.com', 'file:///tmp/a', 'http://user:pass@localhost:11434', 'http://localhost:11434/secret']) expect(() => ollamaBase(url)).toThrow();
  });
  it('sends Anthropic messages with its own authentication and schema', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: 'text', text: 'hello' }] })));
    expect(await complete({ provider: 'anthropic', model: 'test', key: 'private', ollamaUrl: '', system: 'system', prompt: 'seed' }, fetcher)).toBe('hello');
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers['x-api-key']).toBe('private');
    expect(JSON.parse(init.body)).toMatchObject({ system: 'system', messages: [{ role: 'user', content: 'seed' }] });
  });
  it.each(['openai','openrouter'] as const)('uses Bearer authentication for %s', async provider => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] })));
    expect(await complete({ provider, model: 'test', key: 'private', ollamaUrl: '', system: 's', prompt: 'p' }, fetcher)).toBe('ok');
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer private');
    expect(fetcher.mock.calls[0][0]).toContain(provider === 'openai' ? 'api.openai.com' : 'openrouter.ai');
  });
  it('calls Ollama without a key and disables streaming', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: { content: 'local' } })));
    expect(await complete({ provider: 'ollama', model: 'local', key: '', ollamaUrl: 'http://127.0.0.1:11434', system: 's', prompt: 'p' }, fetcher)).toBe('local');
    expect(JSON.parse(fetcher.mock.calls[0][1].body).stream).toBe(false);
  });
  it('does not echo upstream errors that could contain a secret', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('secret key private', { status: 401 }));
    await expect(complete({ provider: 'openai', model: 'test', key: 'private', ollamaUrl: '', system: '', prompt: '' }, fetcher)).rejects.toThrow('Check your API key');
  });
});
describe('jury output', () => {
  it('parses fenced JSON and rejects prose', () => { expect(parseJson('```json\n{"ok":true}\n```')).toEqual({ ok: true }); expect(() => parseJson('here is an idea')).toThrow(); });
  it('computes medals in code and rejects invalid scores', () => {
    const v = { originality: 4, feasibility: 4, impact: 5, reason: 'Clear benefit.', keywords: ['useful'] };
    expect(medal(validateVerdict(v))).toBe('gold');
    expect(medal({ ...v, impact: 3 })).toBe('silver');
    expect(() => validateVerdict({ ...v, originality: 6 })).toThrow();
    expect(() => validateVerdict({ ...v, impact: 4.5 })).toThrow();
  });
});
