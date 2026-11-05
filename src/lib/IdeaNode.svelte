<script lang="ts">
  import { Handle, Position, type NodeProps } from '@xyflow/svelte';
  import { Sprout, GitBranch, Combine, Star, Trash2, Gavel, Sparkles } from '@lucide/svelte';
  import { getContext } from 'svelte';
  import { ideaActionsKey, type IdeaActions } from './idea-actions';
  import { medal, score, type IdeaNode } from './types';
  let { id, data, selected }: NodeProps<IdeaNode> = $props();
  const actions = getContext<IdeaActions>(ideaActionsKey);
  const prompting = $derived(actions.isRunning(id, 'prompt'));
  const branching = $derived(actions.isRunning(id, 'branch'));
  const evaluating = $derived(actions.isRunning(id, 'judge'));
  const colored = $derived(!!data.verdict && actions.evaluationColorsEnabled());
  const evaluationColor = $derived(`hsl(${Math.round(Math.max(0, Math.min(15, score(data.verdict))) / 15 * 120)} 72% 45%)`);
</script>
<div class="idea-node" class:selected class:gold={medal(data.verdict) === 'gold'} class:score-colored={colored} style:--evaluation-color={colored ? evaluationColor : undefined}>
  <Handle type="target" position={Position.Left}/>
  <div class="node-top"><span class="node-kind">{#if data.kind === 'seed'}<Sprout size={13}/>{:else if data.kind === 'cross'}<Combine size={13}/>{:else}<GitBranch size={13}/>{/if}{data.kind === 'cross' ? 'COMBINATION' : data.kind.toUpperCase()}</span>{#if data.starred}<Star size={14} fill="currentColor"/>{/if}<span class="node-score">{data.verdict ? `${score(data.verdict)} / 15` : 'Unscored'}</span></div>
  <h3>{data.title}</h3>{#if actions.isExpanded(id)}<p class="idea-description">{data.description}</p>{/if}
  {#if data.verdict}<div class="node-tags">{#each data.verdict.keywords as tag}<span>{tag}</span>{/each}</div>{/if}
  <div class="node-bottom">
    <span class="tooltip tooltip-top nodrag nopan" data-tip="Delete idea"><button type="button" class="node-action node-delete nodrag nopan" aria-label={`Delete idea: ${data.title}`} disabled={actions.isBusy()} onclick={(event) => { event.stopPropagation(); actions.deleteIdea(id); }}><Trash2 size={14}/></button></span>
    <span class="node-status" class:working={branching || evaluating || prompting} role="status" aria-live="polite"><span class="node-dot"></span>{prompting ? 'Generating prompt…' : branching ? 'Generating branches…' : evaluating ? 'Evaluating…' : medal(data.verdict) === 'gold' ? 'GOLD IDEA' : 'Keep exploring'}</span>
    <div class="node-quick-actions">
      <span class="tooltip tooltip-top nodrag nopan" data-tip="Evaluate with the jury"><button type="button" class="node-action nodrag nopan" aria-label={`Evaluate idea: ${data.title}`} disabled={actions.isBusy()} onclick={(event) => { event.stopPropagation(); actions.evaluateIdea(id); }}>{#if actions.isRunning(id, 'judge')}<span class="loading loading-spinner loading-xs"></span>{:else}<Gavel size={15}/>{/if}</button></span>
      <span class="tooltip tooltip-top nodrag nopan" data-tip="Generate 3 branches"><button type="button" class="node-action nodrag nopan" aria-label={`Branch idea: ${data.title}`} disabled={actions.isBusy()} onclick={(event) => { event.stopPropagation(); actions.branchIdea(id); }}>{#if actions.isRunning(id, 'branch')}<span class="loading loading-spinner loading-xs"></span>{:else}<GitBranch size={15}/>{/if}</button></span>
      <span class="tooltip tooltip-top nodrag nopan" data-tip="Generate Prompt"><button type="button" class="node-action nodrag nopan" aria-label={`Generate Prompt: ${data.title}`} disabled={actions.isBusy()} onclick={(event) => { event.stopPropagation(); actions.generatePrompt(id); }}>{#if prompting}<span class="loading loading-spinner loading-xs"></span>{:else}<Sparkles size={15}/>{/if}</button></span>
    </div>
  </div>
  <Handle type="source" position={Position.Right}/>
</div>
