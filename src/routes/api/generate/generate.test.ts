import { describe, expect, it, vi } from 'vitest';
vi.mock('#lib/server/ai.ts', async importOriginal => ({ ...await importOriginal<typeof import('#lib/server/ai.ts')>(), complete: vi.fn() }));
import { complete } from '#lib/server/ai.ts';
import { POST } from './+server';

describe('build prompt response', () => {
  it.each([
    ['# Build this\n\n```ts\nconst ready = true;\n```', '# Build this\n\n```ts\nconst ready = true;\n```'],
    ['```markdown\n# Build this\n\n## Acceptance criteria\n- Tests pass\n```', '# Build this\n\n## Acceptance criteria\n- Tests pass']
  ])('returns Markdown and preserves internal code fences', async (output, expected) => {
    vi.mocked(complete).mockResolvedValueOnce(output);
    const url = new URL('https://garden.example/api/generate');
    const request = new Request(url, { method: 'POST', headers: { origin: url.origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'ollama', model: 'build-model', role: 'prompt', goal: 'Build a useful tool', context: '{"idea":{"title":"Test"}}' }) });
    const response = await POST({ request, url } as Parameters<typeof POST>[0]);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ markdown: expected });
    expect(complete).toHaveBeenLastCalledWith(expect.objectContaining({ maxTokens: 6000, system: expect.stringContaining('standalone Markdown implementation prompt') }));
  });
});
