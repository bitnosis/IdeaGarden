<script lang="ts">
  import { onMount } from 'svelte';
  import { Trash2 } from '@lucide/svelte';
  let { title, ideaCount, onconfirm, onclose }: { title: string; ideaCount: number; onconfirm: () => void; onclose: () => void } = $props();
  let dialog: HTMLDialogElement, cancelButton: HTMLButtonElement;
  onMount(() => { dialog.showModal(); cancelButton.focus(); });
</script>
<dialog bind:this={dialog} class="modal" aria-label="Delete workspace" onclose={onclose}>
  <div class="modal-box">
    <div class="flex items-center gap-3 mb-4"><Trash2 size={22} class="text-error"/><h2 class="text-xl font-semibold">Delete workspace?</h2></div>
    <p class="text-sm leading-relaxed">This permanently deletes <strong>{title}</strong>, its {ideaCount} {ideaCount === 1 ? 'idea' : 'ideas'}, and all its connections.</p>
    <p class="muted text-sm leading-relaxed mt-3">This cannot be undone. Export a workspace backup first if you want to keep a copy.</p>
    <div class="modal-action"><button type="button" bind:this={cancelButton} class="btn btn-ghost" onclick={() => dialog.close()}>Cancel</button><button type="button" class="btn btn-error" onclick={onconfirm}>Delete workspace</button></div>
  </div>
  <form method="dialog" class="modal-backdrop"><button aria-label="Cancel workspace deletion">close</button></form>
</dialog>
