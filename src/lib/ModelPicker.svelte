<script lang="ts">
  import { tick } from 'svelte';
  import { ChevronDown, Search, Check } from '@lucide/svelte';
  import type { ModelOption } from './models';
  let { value = $bindable(''), options, label, placeholder = 'Choose a model', allowDefault = false }: { value: string; options: ModelOption[]; label: string; placeholder?: string; allowDefault?: boolean } = $props();
  let open = $state(false), query = $state(''), custom = $state(false), index = $state(0);
  let root: HTMLDivElement;
  let searchInput = $state<HTMLInputElement>();
  const uid = $props.id();
  const filtered = $derived(options.filter(m => `${m.id} ${m.name}`.toLowerCase().includes(query.toLowerCase())));
  const current = $derived(options.find(m => m.id === value));
  async function reveal() { open = !open; query = ''; index = 0; if (open) { await tick(); searchInput?.focus(); } }
  function choose(id: string) { value = id; open = false; custom = false; root.querySelector<HTMLButtonElement>('.model-trigger')?.focus(); }
  function keyboard(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); open = false; root.querySelector<HTMLButtonElement>('.model-trigger')?.focus(); }
    else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); index = Math.max(0, Math.min(filtered.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))); document.getElementById(`${uid}-${index}`)?.scrollIntoView({ block: 'nearest' }); }
    else if (event.key === 'Enter') { event.preventDefault(); if (filtered[index]) choose(filtered[index].id); }
  }
</script>
<svelte:window onclick={(event) => { if (open && root && !root.contains(event.target as Node)) open = false; }}/>
<div class="model-picker" bind:this={root}>
  <span class="model-field-label" id={`${uid}-label`}>{label}</span>
  <button type="button" class="model-trigger input w-full" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${uid}-list`} onclick={reveal}><span>{current?.name || value || placeholder}</span><ChevronDown size={15}/></button>
  {#if value && current && current.name !== value}<small class="model-id">{value}</small>{/if}
  {#if open}<div class="model-popover">
    <div class="model-search"><Search size={14}/><input bind:this={searchInput} aria-label={`Search ${label}`} role="combobox" aria-expanded={true} aria-controls={`${uid}-list`} aria-autocomplete="list" aria-activedescendant={filtered[index] ? `${uid}-${index}` : undefined} placeholder="Search by name or ID…" bind:value={query} oninput={() => index = 0} onkeydown={keyboard}/></div>
    <div class="model-options" id={`${uid}-list`} role="listbox" aria-labelledby={`${uid}-label`}>
      {#if allowDefault}<button type="button" role="option" aria-selected={!value} onclick={() => choose('')}>Use workspace default</button>{/if}
      {#each filtered as model, i (model.id)}<button type="button" id={`${uid}-${i}`} role="option" aria-selected={value === model.id} class:highlighted={i === index} onclick={() => choose(model.id)}><span>{model.name}<small>{model.id}</small></span>{#if value === model.id}<Check size={14}/>{/if}</button>{/each}
      {#if !filtered.length}<p class="model-no-results">{options.length ? 'No matching models.' : 'Refresh to load models from the provider.'}</p>{/if}
    </div>
    <button type="button" class="model-custom-button" onclick={() => { custom = true; open = false; }}>Enter a custom model ID…</button>
  </div>{/if}
  {#if custom}<label class="field mt-2">Custom model ID<input class="input input-sm w-full" aria-label={`Custom ${label}`} bind:value spellcheck="false" placeholder="Enter exact model ID"/></label>{/if}
</div>
