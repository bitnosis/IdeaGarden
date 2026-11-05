<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import { FileText, Copy, Download, Trash2, ChevronDown, Check } from '@lucide/svelte';
  import { getContext } from 'svelte';
  import { marked } from 'marked';
  import DOMPurify from 'dompurify';
  import { ideaActionsKey, type IdeaActions } from './idea-actions';
  import type { PromptNode } from './types';
  let { id, data }: NodeProps<PromptNode> = $props();
  const actions = getContext<IdeaActions>(ideaActionsKey);
  const expanded = $derived(actions.isExpanded(id));
  const html = $derived(expanded && typeof window !== 'undefined' ? DOMPurify.sanitize(marked.parse(data.markdown, { async: false }), { USE_PROFILES: { html: true }, FORBID_TAGS: ['img', 'style', 'form', 'input', 'button', 'video', 'audio', 'iframe'], FORBID_ATTR: ['style'] }) : '');
  let copied = $state(false), error = $state('');
  async function copy(event: MouseEvent) {
    event.stopPropagation();
    try { await navigator.clipboard.writeText(data.markdown); copied = true; error = ''; }
    catch { error = 'Clipboard access was blocked. Download the Markdown file instead.'; }
  }
  function download(event: MouseEvent) {
    event.stopPropagation();
    const url = URL.createObjectURL(new Blob([data.markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'idea'}-prompt.md`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
</script>
<div class="prompt-node" class:expanded>
  <Handle type="target" position={Position.Left}/>
  <button type="button" class="prompt-node-toggle nodrag nopan" aria-label={`Read prompt: ${data.title}`} aria-expanded={expanded} onclick={(event) => { event.stopPropagation(); actions.togglePrompt(id); }}><span class="prompt-node-kind"><FileText size={15}/> PROMPT NODE <ChevronDown size={15} class={expanded ? 'rotate-180 ml-auto' : 'ml-auto'}/></span><span class="prompt-node-title">{data.title}</span></button>
  <p class="prompt-node-hint">{expanded ? 'Click the header to collapse' : 'Click to read the build prompt'}</p>
  <div class="prompt-node-actions nodrag nopan">
    <button type="button" class="btn btn-ghost btn-xs" aria-label="Copy Markdown" onclick={copy}>{#if copied}<Check size={14}/>{:else}<Copy size={14}/>{/if}{copied ? 'Copied' : 'Copy Markdown'}</button>
    <button type="button" class="btn btn-ghost btn-xs" aria-label="Download Markdown" onclick={download}><Download size={14}/>.md</button>
    <button type="button" class="btn btn-ghost btn-xs btn-square ml-auto text-error" aria-label={`Delete prompt: ${data.title}`} title="Delete prompt" disabled={actions.isBusy()} onclick={(event) => { event.stopPropagation(); actions.deleteIdea(id); }}><Trash2 size={14}/></button>
  </div>
  {#if error}<p role="alert" class="text-error text-xs">{error}</p>{/if}
  {#if expanded}<div class="prompt-markdown nodrag nopan nowheel" role="region" aria-label={`Build prompt: ${data.title}`}>{@html html}</div>{/if}
</div>
