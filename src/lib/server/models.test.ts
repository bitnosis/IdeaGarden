import { describe, expect, it, vi } from 'vitest';
import { listModels } from './models';
const reply = (data: unknown) => new Response(JSON.stringify(data));
describe('live model discovery', () => {
  it('loads the public OpenRouter catalogue and keeps text-output models', async () => {
    const fetcher = vi.fn().mockResolvedValue(reply({ data: [{ id: 'z/text', name: 'Zeta', architecture: { output_modalities: ['text'] } }, { id: 'a/text', name: 'Alpha' }, { id: 'image/only', architecture: { output_modalities: ['image'] } }, { id: 'a/text', name: 'Alpha' }] }));
    const models = await listModels({ provider: 'openrouter', key: '', ollamaUrl: '' }, fetcher);
    expect(models.map(m => m.id)).toEqual(['a/text', 'z/text']);
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
  it('uses the supplied OpenRouter key when present', async () => {
    const fetcher = vi.fn().mockResolvedValue(reply({ data: [] }));
    await listModels({ provider: 'openrouter', key: 'private', ollamaUrl: '' }, fetcher);
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer private');
  });
  it('filters known non-chat OpenAI models and sends auth only to the fixed URL', async () => {
    const fetcher = vi.fn().mockResolvedValue(reply({ data: [{ id: 'gpt-test' }, { id: 'text-embedding-3-small' }, { id: 'gpt-image-test' }, { id: 'whisper-1' }, { id: 'gpt-realtime' }] }));
    expect(await listModels({ provider: 'openai', key: 'private', ollamaUrl: '' }, fetcher)).toEqual([{ id: 'gpt-test', name: 'gpt-test' }]);
    expect(fetcher.mock.calls[0][0]).toBe('https://api.openai.com/v1/models');
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer private');
    expect(fetcher.mock.calls[0][1].redirect).toBe('error');
  });
  it('follows Anthropic pagination and keeps display names', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(reply({ data: [{ id: 'claude-a', display_name: 'Claude A' }], has_more: true, last_id: 'claude-a' })).mockResolvedValueOnce(reply({ data: [{ id: 'claude-b', display_name: 'Claude B' }], has_more: false }));
    expect((await listModels({ provider: 'anthropic', key: 'private', ollamaUrl: '' }, fetcher)).length).toBe(2);
    expect(fetcher.mock.calls[1][0]).toContain('after_id=claude-a');
    expect(fetcher.mock.calls[0][1].headers['x-api-key']).toBe('private');
  });
  it('rejects repeated pagination cursors', async () => {
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(reply({ data: [], has_more: true, last_id: 'same' })));
    await expect(listModels({ provider: 'anthropic', key: 'x', ollamaUrl: '' }, fetcher)).rejects.toThrow('pagination');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('lists local Ollama models without forwarding a key', async () => {
    const fetcher = vi.fn().mockResolvedValue(reply({ models: [{ name: 'qwen3:8b', model: 'qwen3:8b' }] }));
    expect(await listModels({ provider: 'ollama', key: 'ignored', ollamaUrl: 'http://localhost:11434' }, fetcher)).toEqual([{ id: 'qwen3:8b', name: 'qwen3:8b' }]);
    expect(fetcher.mock.calls[0][0]).toBe('http://localhost:11434/api/tags');
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
  it('rejects remote Ollama URLs before making requests', async () => {
    const fetcher = vi.fn();
    await expect(listModels({ provider: 'ollama', key: '', ollamaUrl: 'https://example.com' }, fetcher)).rejects.toThrow('local URL');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('requires keys for private catalogues and sanitizes provider errors', async () => {
    await expect(listModels({ provider: 'openai', key: '', ollamaUrl: '' })).rejects.toThrow('Add an API key');
    const fetcher = vi.fn().mockResolvedValue(new Response('secret-provider-error', { status: 401 }));
    await expect(listModels({ provider: 'openai', key: 'private', ollamaUrl: '' }, fetcher)).rejects.toThrow('rejected this API key');
  });
  it('rejects malformed catalogue responses', async () => {
    const fetcher = vi.fn().mockResolvedValue(reply({ unexpected: [] }));
    await expect(listModels({ provider: 'openrouter', key: '', ollamaUrl: '' }, fetcher)).rejects.toThrow('unexpected model list');
  });
});
