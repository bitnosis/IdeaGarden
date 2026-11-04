<script lang="ts">
  import { providers, roles, type Settings, type SettingsTab } from './types';
  import { X, KeyRound, Server, RefreshCw } from '@lucide/svelte';
  import ModelCatalog from './ModelCatalog.svelte';
  import ModelPicker from './ModelPicker.svelte';
  import type { ModelOption } from './models';
  import KeyVaultView from './KeyVault.svelte';
  import type { KeyVault } from './key-vault.svelte';
  import { onMount, tick, untrack } from 'svelte';
  import ThemePicker from './ThemePicker.svelte';
  import { cardFonts, type CardFont } from './card-fonts';
  const fontChoices = Object.keys(cardFonts) as CardFont[];
  let { settings = $bindable(), vault, generationBusy = false, initialTab = 'settings', focusRole, onclose, onboardsettings }: { settings: Settings; vault: KeyVault; generationBusy?: boolean; initialTab?: SettingsTab; focusRole?: 'judge'; onclose: () => void; onboardsettings?: () => void } = $props();
  let tab = $state(untrack(() => initialTab));
  let connectionsVisited = $state(untrack(() => initialTab === 'connections'));
  let modelsVisited = $state(untrack(() => initialTab === 'models'));
  const tabs: { id: SettingsTab; label: string }[] = [{ id: 'settings', label: 'Settings' }, { id: 'connections', label: 'Connections' }, { id: 'models', label: 'Models' }];
  const uid = $props.id();
  let dialog: HTMLDialogElement;
  let jurySection = $state<HTMLDivElement>();
  onMount(() => {
    dialog.showModal();
    if (initialTab === 'models') assignExistingDefaults();
    if (focusRole === 'judge') void tick().then(() => { jurySection?.scrollIntoView({ block: 'center' }); jurySection?.querySelector<HTMLButtonElement>('.model-trigger')?.focus(); });
  });
  function assignExistingDefaults() { for (const role of roles) if (!settings.roleModels[role].trim()) settings.roleModels[role] = `${settings.provider}:${settings.models[settings.provider]}`; }
  function selectTab(next: SettingsTab) { tab = next; if (next === 'connections') connectionsVisited = true; if (next === 'models') { assignExistingDefaults(); modelsVisited = true; } }
  function tabKey(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.findIndex(t => t.id === tab);
    const next = event.key === 'Home' ? tabs[0].id : event.key === 'End' ? tabs.at(-1)!.id : tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length].id;
    selectTab(next); document.getElementById(`${uid}-${next}-tab`)?.focus();
  }
  let catalogs = $state<Record<string, { models: ModelOption[]; loading: boolean; error: string }>>({});
  let catalogRevision = $state(0);
  const catalogLoading = $derived(Object.values(catalogs).some(c => c.loading));
  const catalogErrors = $derived(providers.filter(p => catalogs[p]?.error).map(p => `${p}: ${catalogs[p].error}`));
  const roleOptions = $derived.by(() => {
    const choices = new Map<string, ModelOption>();
    for (const p of providers) for (const model of catalogs[p]?.models || []) choices.set(`${p}:${model.id}`, { id: `${p}:${model.id}`, name: `${p} · ${model.name}` });
    for (const value of [...providers.map(p => `${p}:${settings.models[p]}`), ...roles.map(r => settings.roleModels[r])]) {
      if (value && !choices.has(value)) choices.set(value, { id: value, name: value.replace(':', ' · ') });
    }
    return [...choices.values()];
  });
</script>
<dialog bind:this={dialog} class="modal" aria-label="Settings" onclose={onclose}>
 <div class="modal-box settings-box">
  <div class="settings-tabs-row"><div class="tabs tabs-border" role="tablist" aria-label="Settings sections">{#each tabs as item}<button type="button" role="tab" id={`${uid}-${item.id}-tab`} aria-controls={`${uid}-${item.id}-panel`} aria-selected={tab === item.id} tabindex={tab === item.id ? 0 : -1} class="tab" class:tab-active={tab === item.id} onclick={() => selectTab(item.id)} onkeydown={tabKey}>{item.label}</button>{/each}</div><button class="btn btn-ghost btn-sm btn-square" aria-label="Close settings" onclick={() => dialog.close()}><X size={20}/></button></div>
  <div role="tabpanel" tabindex="0" id={`${uid}-settings-panel`} aria-labelledby={`${uid}-settings-tab`} hidden={tab !== 'settings'}>
    <div class="setting-section"><h3>Theme</h3><p class="muted text-xs mb-3">Choose your workspace colors.</p><ThemePicker bind:theme={settings.theme}/></div>
    <div class="setting-section"><label class="field">Card font<select class="select w-full" aria-label="Card font" bind:value={settings.cardFont}>{#each fontChoices as font}<option value={font}>{cardFonts[font].label}</option>{/each}</select></label><p class="muted text-xs mb-3">Applies to idea titles and descriptions. Uses fonts already on your device.</p><div class="card-font-preview" style:font-family={cardFonts[settings.cardFont].family}><strong>A little idea with big potential.</strong><p>Follow your curiosity and see where the next branch takes you.</p></div></div>
    <div class="setting-section"><label class="field">Idea View<select class="select w-full" aria-label="Idea View" bind:value={settings.ideaView}><option value="sidebar">Sidebar</option><option value="modal">Modal</option></select></label><p class="muted text-xs">Choose how idea details open when you click a node. Modal view gives the board the full workspace width.</p></div>
    <div class="setting-section"><label class="flex items-center justify-between gap-4 text-sm font-semibold"><span>Auto-evaluate</span><input type="checkbox" class="toggle toggle-primary toggle-sm" bind:checked={settings.autoEvaluate}/></label><p class="muted text-xs mt-3">Automatically evaluate AI-generated seeds, branches, and combined ideas using your Jury model. Each new idea uses an additional evaluation request.</p></div>
    <div class="setting-section"><label class="flex items-center justify-between gap-4 text-sm font-semibold"><span>Evaluation colors</span><input type="checkbox" class="toggle toggle-primary toggle-sm" bind:checked={settings.evaluationColors}/></label><p class="muted text-xs mt-3">Color scored idea outlines from red to green based on their score out of 15. Unscored ideas keep their normal outline.</p><div class="evaluation-color-legend" aria-hidden="true"><span>Low</span><i></i><span>High</span></div></div>
    {#if onboardsettings}<div class="setting-section"><button type="button" class="btn btn-outline btn-sm" disabled={generationBusy} onclick={onboardsettings}>Board settings</button><p class="muted text-xs mt-2">Update the board goal or manage this board.</p></div>{/if}
  </div>
  <div role="tabpanel" tabindex="0" id={`${uid}-connections-panel`} aria-labelledby={`${uid}-connections-tab`} hidden={tab !== 'connections'}>{#if connectionsVisited}
  <p class="muted text-sm my-4">Connect your providers and manage your encrypted API keys. Choose models separately in the Models tab.</p>

  <div class="provider-grid">{#each providers as p}<section class="provider-card"><h3>{#if p === 'ollama'}<Server size={16}/>{:else}<KeyRound size={16}/>{/if}{p === 'openai' ? 'OpenAI' : p === 'openrouter' ? 'OpenRouter' : p === 'anthropic' ? 'Anthropic' : 'Ollama'}</h3>
  {#if p !== 'ollama'}<label class="field">API key<input class="input w-full" type="password" autocomplete="off" placeholder={vault.state.exists && !vault.state.unlocked ? 'Unlock the key vault below' : 'Enter API key'} disabled={vault.state.busy || (vault.state.exists && !vault.state.unlocked)} bind:value={settings.keys[p]}/></label>{:else}<label class="field">Local server URL<input class="input w-full" bind:value={settings.ollamaUrl}/></label>{/if}
  </section>{/each}</div>
  <KeyVaultView {vault} bind:keys={settings.keys} {generationBusy}/>

  {/if}</div>
  <div role="tabpanel" tabindex="0" id={`${uid}-models-panel`} aria-labelledby={`${uid}-models-tab`} hidden={tab !== 'models'}>{#if modelsVisited}
    {#each providers as p}<ModelCatalog provider={p} apiKey={settings.keys[p]} ollamaUrl={settings.ollamaUrl} revision={catalogRevision} onchange={(state) => { catalogs[p] = state; }}/>{/each}
    <div class="flex items-center gap-3 justify-between mb-2"><p class="muted text-xs">Assign a provider and model to each role.</p><button type="button" class="btn btn-ghost btn-xs shrink-0" disabled={catalogLoading} onclick={() => catalogRevision++}><RefreshCw size={13} class={catalogLoading ? 'animate-spin' : ''}/>Refresh models</button></div>
    {#if catalogErrors.length}<details class="text-xs muted mb-2"><summary class="cursor-pointer">Some model lists could not load</summary>{#each catalogErrors as error}<p class="my-2">{error}</p>{/each}<button type="button" class="link text-primary" onclick={() => selectTab('connections')}>Open Connections</button></details>{/if}
    <div bind:this={jurySection} class="role-model-row jury-model-row" class:focused={focusRole === 'judge'}><h3 class="font-semibold text-sm mb-2">The jury</h3><p class="muted text-xs mb-3">Score originality, feasibility, and impact.</p><ModelPicker bind:value={settings.roleModels.judge} options={roleOptions} label="Jury model" placeholder="Choose a model"/></div>
    <div class="role-model-grid">{#each roles.filter(role => role !== 'judge') as role}<div class="role-model-row"><ModelPicker bind:value={settings.roleModels[role]} options={roleOptions} label={`${role} model`} placeholder="Choose a model"/></div>{/each}</div>
  {/if}</div>
  <div class="modal-action"><button class="btn btn-primary" onclick={() => dialog.close()}>Done</button></div>
 </div>
 <form method="dialog" class="modal-backdrop"><button aria-label="Dismiss settings">close</button></form>
</dialog>
