import type { Provider } from '../types';
import type { ModelOption } from '../models';
import { ollamaBase } from './ai';

// OpenAI's list has no endpoint capability field. Exclude known non-chat families;
// keep custom IDs available because a catalogue listing cannot guarantee chat access.
export function isChatCandidate(id: string) {
  return !/(embedding|whisper|tts|transcrib|realtime|audio|moderation|dall-e|image|sora|search|deep-research|codex|davinci|babbage)/i.test(id);
}
export async function listModels(input: { provider: Provider; key: string; ollamaUrl: string }, fetcher: typeof fetch = fetch): Promise<ModelOption[]> {
  const { provider, key } = input;
  if ((provider === 'openai' || provider === 'anthropic') && !key) throw new Error('Add an API key, or configure a server environment key and refresh.');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (provider === 'anthropic') { headers['x-api-key'] = key; headers['anthropic-version'] = '2023-06-01'; }
  else if (provider !== 'ollama' && key) headers.Authorization = `Bearer ${key}`;
  const base = provider === 'ollama' ? `${ollamaBase(input.ollamaUrl)}/api/tags` : provider === 'anthropic' ? 'https://api.anthropic.com/v1/models?limit=100' : provider === 'openai' ? 'https://api.openai.com/v1/models' : 'https://openrouter.ai/api/v1/models?output_modalities=text';
  const models = new Map<string, ModelOption>();
  const cursors = new Set<string>();
  const signal = AbortSignal.timeout(20000);
  let next = base;
  for (let page = 0; page < 30; page++) {
    let response: Response;
    try { response = await fetcher(next, { headers, signal, redirect: 'error' }); }
    catch { throw new Error(provider === 'ollama' ? 'Could not reach Ollama. Make sure it is running at the local server URL.' : 'Could not reach the provider. Please try refreshing the list.'); }
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'The provider rejected this API key. Check the key and its permissions.' : response.status === 429 ? 'The provider rate limit was reached. Try refreshing later.' : `The provider could not list models (HTTP ${response.status}).`);
    let data: any;
    try { data = await response.json(); } catch { throw new Error('The provider returned an unreadable model list.'); }
    const entries = provider === 'ollama' ? data?.models : data?.data;
    if (!Array.isArray(entries)) throw new Error('The provider returned an unexpected model list.');
    for (const entry of entries) {
      if (!entry || typeof entry !== 'object') continue;
      const id = provider === 'ollama' ? entry.model || entry.name : entry.id;
      if (typeof id !== 'string' || !id.trim() || id.length > 200) continue;
      if (provider === 'openai' && !isChatCandidate(id)) continue;
      if (provider === 'openrouter' && Array.isArray(entry.architecture?.output_modalities) && !entry.architecture.output_modalities.includes('text')) continue;
      if (provider === 'anthropic' && entry.lifecycle === 'retired') continue;
      const name = entry.display_name || entry.name || id;
      models.set(id, { id, name: typeof name === 'string' ? name.slice(0, 200) : id });
    }
    if (provider !== 'anthropic' || !data.has_more) return [...models.values()].sort((a, b) => a.name.localeCompare(b.name));
    if (typeof data.last_id !== 'string' || !data.last_id || cursors.has(data.last_id)) throw new Error('The provider returned an invalid pagination cursor. Please refresh.');
    cursors.add(data.last_id);
    next = `${base}&after_id=${encodeURIComponent(data.last_id)}`;
  }
  throw new Error('The provider returned too many model pages. Try again later.');
}
