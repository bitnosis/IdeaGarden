<script lang="ts">
  import { untrack } from 'svelte';
  import type { Provider } from './types';
  import type { ModelOption } from './models';
  let { provider, apiKey, ollamaUrl, revision, onchange }: { provider: Provider; apiKey: string; ollamaUrl: string; revision: number; onchange: (state: { models: ModelOption[]; loading: boolean; error: string }) => void } = $props();
  $effect(() => {
    const key = apiKey.trim(), address = ollamaUrl, refresh = revision;
    const controller = new AbortController();
    untrack(() => onchange({ models: [], loading: false, error: '' }));
    const timer = setTimeout(async () => {
      if (!key && provider !== 'openrouter' && provider !== 'ollama' && !refresh) return;
      onchange({ models: [], loading: true, error: '' });
      try {
        const response = await fetch('/api/models', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider, key, ollamaUrl: address }), signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load models.');
        if (!controller.signal.aborted) onchange({ models: data.models, loading: false, error: '' });
      } catch (error) { if (!controller.signal.aborted) onchange({ models: [], loading: false, error: error instanceof Error ? error.message : 'Could not load models.' }); }
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  });
</script>
