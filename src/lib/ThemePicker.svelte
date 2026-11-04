<script lang="ts">
  import { Palette, X } from '@lucide/svelte';
  let { theme = $bindable('abyss'), iconOnly = false }: { theme: string; iconOnly?: boolean } = $props();
  let dialog: HTMLDialogElement;
  // Same built-in catalogue, card layout and three swatches as OhMyPi-UI.
  const themes = ['light', 'dark', 'cupcake', 'bumblebee', 'emerald', 'corporate', 'synthwave', 'retro', 'cyberpunk', 'valentine', 'halloween', 'garden', 'omp', 'forest', 'aqua', 'lofi', 'pastel', 'fantasy', 'wireframe', 'black', 'luxury', 'dracula', 'cmyk', 'autumn', 'business', 'acid', 'lemonade', 'night', 'coffee', 'winter', 'dim', 'nord', 'sunset', 'caramellatte', 'abyss', 'silk'];
</script>

{#if iconOnly}<span class="tooltip tooltip-top max-md:tooltip-right" data-tip="Themes"><button type="button" class="sidebar-icon-button" aria-label="Themes" onclick={() => dialog.showModal()}><Palette size={18}/></button></span>{:else}<button type="button" class="theme-trigger" aria-label="Choose theme" title="Choose theme" onclick={() => dialog.showModal()}><Palette size={16}/><span>Appearance</span><span class="current-theme">{theme}</span></button>{/if}
<dialog bind:this={dialog} class="modal" aria-label="Appearance">
  <div class="modal-box theme-modal-box">
    <div class="flex items-center justify-between"><h2 class="text-lg font-bold">Appearance</h2><button type="button" class="btn btn-ghost btn-sm btn-square" aria-label="Close themes" onclick={() => dialog.close()}><X size={18}/></button></div>
    <p class="muted my-3 text-sm">Choose a theme for your workspace.</p>
    <div class="grid grid-cols-3 gap-2 sm:grid-cols-5">
      {#each themes as name (name)}<button type="button" data-theme={name} class="theme-choice" class:selected={theme === name} aria-label={`Use ${name} theme`} aria-pressed={theme === name} onclick={() => theme = name}><span>{name === 'omp' ? 'OhMyPi' : name}</span><span class="flex gap-1" aria-hidden="true"><i class="bg-primary"></i><i class="bg-secondary"></i><i class="bg-accent"></i></span></button>{/each}
    </div>
  </div>
  <form method="dialog" class="modal-backdrop"><button aria-label="Dismiss theme picker">close</button></form>
</dialog>

<style>
  .theme-trigger { display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--color-base-200); color: var(--color-base-content); font-size: 12px; }
  .theme-trigger .current-theme { margin-left: auto; font-size: 10px; opacity: .75; }
  .theme-modal-box { max-width: 48rem; }
  .theme-choice { display: flex; flex-direction: column; gap: 12px; align-items: start; padding: 12px; border: 1px solid var(--color-base-300); border-radius: 8px; background: var(--color-base-200); color: var(--color-base-content); font-size: 11px; cursor: pointer; min-width: 0; }
  .theme-choice.selected { outline: 2px solid var(--color-primary); outline-offset: 1px; }
  .theme-choice:focus-visible { outline: 2px solid var(--color-base-content); outline-offset: 2px; }
  .theme-choice i { width: 14px; height: 14px; border-radius: 50%; }
</style>
