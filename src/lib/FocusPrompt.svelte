<script lang="ts">
  import { useSvelteFlow } from '@xyflow/svelte';
  import { tick } from 'svelte';
  let { id, expanded }: { id: string; expanded: boolean } = $props();
  const flow = useSvelteFlow();
  $effect(() => {
    const nodeId = id;
    void expanded;
    if (!nodeId) return;
    let cancelled = false;
    void tick().then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))).then(() => {
      if (!cancelled) void flow.fitView({ nodes: [{ id: nodeId }], padding: 0.35, maxZoom: 1, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 250 });
    });
    return () => { cancelled = true; };
  });
</script>
