<script lang="ts">
  import { onMount, setContext, tick } from 'svelte';
  import { ideaActionsKey, type IdeaActions } from '#lib/idea-actions.ts';
  import { createKeyVault } from '#lib/key-vault.svelte.ts';
  import { loadSettings, persistSettings } from '#lib/settings-storage.ts';
  import { SvelteFlow, Background, Controls, MiniMap, type Edge, type Connection } from '@xyflow/svelte';
  import { Sprout, Plus, Settings as SettingsIcon, Download, Upload, Search, GitBranch, Combine, Gavel, Star, Trash2, X, ArrowUp, PanelRightClose, FileText, LayoutGrid, Check, ChevronDown, Pencil } from '@lucide/svelte';
  import IdeaNodeView from '#lib/IdeaNode.svelte';
  import SettingsView from '#lib/Settings.svelte';
  import DeleteWorkspaceDialog from '#lib/DeleteWorkspaceDialog.svelte';
  import GrowingSprout from '#lib/GrowingSprout.svelte';
  import UnlockVaultDialog from '#lib/UnlockVaultDialog.svelte';
  import ThemePicker from '#lib/ThemePicker.svelte';
  import { cardFonts } from '#lib/card-fonts.ts';
  import { defaultSettings, createBoard, providers, score, medal, type Board, type IdeaNode, type Settings, type Role, type Provider, type SettingsTab } from '#lib/types.ts';
  const nodeTypes = { idea: IdeaNodeView };
  let settings = $state<Settings>(defaultSettings());
  let flowColorMode = $state<'light' | 'dark'>('dark');
  const vault = createKeyVault();
  let showUnlock = $state(false);
  let activeIdeaAction = $state<{ id: string; role: Role } | null>(null);
  let expandedIdeaId = $state('');
  let boards = $state<Board[]>([]), activeId = $state(''), nodes = $state<IdeaNode[]>([]), edges = $state<Edge[]>([]);
  let ready = $state(false), showSettings = $state(false), showNew = $state(false), showSummary = $state(false), inspector = $state(true);
  let selectedId = $state(''), seed = $state(''), search = $state(''), busy = $state(''), message = $state(''), storageError = $state('');
  let newTitle = $state(''), newGoal = $state(''), combineTarget = $state(''), onlyStarred = $state(false), seedMode = $state<'manual' | 'ai'>('manual');
  let showEditBoard = $state(false), deleteBoardId = $state(''), boardStorageReady = $state(false);
  let settingsTab = $state<SettingsTab>('settings'), settingsFocusRole = $state<'judge' | undefined>();
  let restoreIdeaAfterSettings = $state(false);
  let ideaModalOpen = $state(false), ideaDialog = $state<HTMLDialogElement>();
  let renamingBoard = $state(false), boardTitleDraft = $state(''), boardTitleInput = $state<HTMLInputElement>();
  let importInput: HTMLInputElement;
  const active = $derived(boards.find(b => b.id === activeId));
  const deleteTarget = $derived(boards.find(b => b.id === deleteBoardId));
  const selected = $derived(nodes.find(n => n.id === selectedId));
  const seedModel = $derived(settings.roleModels.seed || `${settings.provider}:${settings.models[settings.provider]}`);
  const totalGold = $derived(nodes.filter(n => medal(n.data.verdict) === 'gold').length);
  const matches = $derived(nodes.filter(n => (!onlyStarred || n.data.starred) && `${n.data.title} ${n.data.description}`.toLowerCase().includes(search.toLowerCase())));
  onMount(() => {
    vault.initialize(localStorage);
    try {
      const loaded = loadSettings(localStorage);
      settings = loaded.settings;
      if (loaded.migrated) { message = 'Previously saved keys are now memory-only. Set a vault password to save them encrypted.'; openSettings('connections'); }
    } catch { storageError = 'Settings could not be loaded or migrated. Check browser storage before saving API keys.'; }
    try {
      const saved = localStorage.getItem('idea-garden-boards');
      boards = saved ? validateBoards(JSON.parse(saved)) : [];
      const last = localStorage.getItem('idea-garden-active');
      switchBoard(boards.find(b => b.id === last)?.id || boards[0]?.id || '');
      boardStorageReady = true;
    } catch { storageError = 'Saved workspaces could not be loaded. Import a backup to recover them.'; boards = []; switchBoard(''); }
    ready = true;
    showUnlock = vault.state.exists && !vault.state.unlocked && !showSettings;
  });
  $effect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.setProperty('--idea-card-font', cardFonts[settings.cardFont].family);
    flowColorMode = getComputedStyle(document.documentElement).colorScheme.includes('dark') ? 'dark' : 'light';
    try { persistSettings(localStorage, settings); } catch { storageError = 'Settings could not be saved. Browser storage may be full.'; }
  });
  $effect(() => {
    if (!ready || !boardStorageReady) return;
    const snapshot = boards.map(b => b.id === activeId ? { ...b, nodes, edges } : b);
    try { localStorage.setItem('idea-garden-boards', JSON.stringify(snapshot)); localStorage.setItem('idea-garden-active', activeId); } catch { storageError = 'Board could not be saved. Export a backup before closing.'; }
  });
  function syncBoard() { const b = boards.find(b => b.id === activeId); if (b) { b.nodes = nodes; b.edges = edges; } }
  async function renameBoard() { if (!active || busy) return; boardTitleDraft = active.title; renamingBoard = true; await tick(); boardTitleInput?.focus(); boardTitleInput?.select(); }
  function saveBoardTitle() { if (!active || busy || !boardTitleDraft.trim()) return; active.title = boardTitleDraft.trim(); renamingBoard = false; }
  function openBoardSettings() { if (!active || busy) return; showSettings = false; newTitle = active.title; newGoal = active.goal; showEditBoard = true; }
  function requestDeleteWorkspace(id: string) { if (busy) return; deleteBoardId = id; }
  function deleteWorkspace(id: string) {
    if (busy) return;
    const title = boards.find(b => b.id === id)?.title;
    syncBoard(); boards = boards.filter(b => b.id !== id);
    if (activeId === id) {
      activeId = ''; nodes = []; edges = []; selectedId = ''; ideaModalOpen = false; showSummary = false;
      switchBoard(boards[0]?.id || '');
    }
    deleteBoardId = ''; message = `Workspace “${title}” deleted.`;
  }
  function openSettings(tab: SettingsTab = 'settings', focusRole?: 'judge') { restoreIdeaAfterSettings = false; ideaModalOpen = false; settingsTab = tab; settingsFocusRole = focusRole; showSettings = true; }
  function openJurySettings() { const restore = settings.ideaView === 'modal' && ideaModalOpen; openSettings('models', 'judge'); restoreIdeaAfterSettings = restore; }
  function closeSettings() { showSettings = false; if (restoreIdeaAfterSettings && selected && settings.ideaView === 'modal') ideaModalOpen = true; restoreIdeaAfterSettings = false; }
  function openIdea(id: string, expand = false) { selectedId = id; expandedIdeaId = expand ? id : ''; if (settings.ideaView === 'modal') ideaModalOpen = true; else inspector = true; }
  $effect(() => {
    if (!ideaDialog) return;
    const open = settings.ideaView === 'modal' && ideaModalOpen && !!selected && !showSettings;
    if (open && !ideaDialog.open) ideaDialog.showModal();
    else if (!open && ideaDialog.open) ideaDialog.close();
  });
  function switchBoard(id: string) { syncBoard(); activeId = id; const b = boards.find(b => b.id === id); nodes = b?.nodes || []; edges = b?.edges || []; selectedId = ''; expandedIdeaId = ''; renamingBoard = false; search = ''; onlyStarred = false; combineTarget = ''; }
  function makeBoard() { if (!newTitle.trim() || !newGoal.trim()) return; const b = createBoard(newTitle.trim(), newGoal.trim()); syncBoard(); boards.push(b); boardStorageReady = true; switchBoard(b.id); showNew = false; newTitle = ''; newGoal = ''; }
  function addIdeas(ideas: {title: string; description: string}[], kind: 'seed'|'branch'|'cross', parents: IdeaNode[] = [], reveal = true) {
    const x = parents.length ? Math.max(...parents.map(p => p.position.x)) + 380 : 80;
    const y = parents.length ? parents.reduce((sum,p) => sum + p.position.y, 0) / parents.length : nodes.length * 240;
    const added: IdeaNode[] = ideas.map((idea, i) => ({ id: crypto.randomUUID(), type: 'idea', position: { x, y: y + (i - (ideas.length - 1) / 2) * 270 }, data: { ...idea, kind } }));
    nodes = [...nodes, ...added]; edges = [...edges, ...added.flatMap(n => parents.map(p => ({ id: crypto.randomUUID(), source: p.id, target: n.id })))];
    if (reveal) openIdea(added[0].id);
    return added;
  }
  async function request(role: Role, context: string) {
    const override = settings.roleModels[role].trim();
    const colon = override.indexOf(':');
    const provider = override ? override.slice(0, colon) as Provider : settings.provider;
    const model = override ? override.slice(colon + 1) : settings.models[provider];
    if (override && (colon < 1 || !providers.includes(provider))) throw new Error(`Invalid ${role} model override. Use provider:model.`);
    if (provider !== 'ollama' && vault.state.exists && !vault.state.unlocked) { openSettings('connections'); throw new Error('Unlock your API key vault in Settings → Connections to use this provider.'); }
    const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, context, goal: active?.goal || '', provider, model, key: settings.keys[provider], ollamaUrl: settings.ollamaUrl }) });
    const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Generation failed.'); return data;
  }
  async function run(role: Role, parents: IdeaNode[] = [], revealResults = true) {
    if (busy || !active) return;
    busy = role; message = ''; const boardId = activeId; const seedText = seed.trim();
    const autoEvaluate = settings.autoEvaluate;
    activeIdeaAction = parents[0] ? { id: parents[0].id, role } : null;
    try {
      const context = role === 'seed' ? seedText : JSON.stringify((role === 'summary' ? nodes : parents).map(n => ({ id: n.id, ...n.data })));
      const result = await request(role, context);
      if (activeId !== boardId) return;
      if (role === 'judge') nodes = nodes.map(n => n.id === parents[0]?.id ? { ...n, data: { ...n.data, verdict: result.verdict } } : n);
      else if (role === 'summary') { active.summary = result.summary; showSummary = true; }
      else {
        const added = addIdeas(result.ideas, role, parents, revealResults);
        if (role === 'seed') seed = '';
        if (autoEvaluate) {
          busy = 'judge';
          let failed = 0;
          let failureReason = '';
          for (const idea of added) {
            if (activeId !== boardId) return;
            activeIdeaAction = { id: idea.id, role: 'judge' };
            try {
              const evaluation = await request('judge', JSON.stringify([{ id: idea.id, ...idea.data }]));
              if (activeId !== boardId) return;
              nodes = nodes.map(n => n.id === idea.id ? { ...n, data: { ...n.data, verdict: evaluation.verdict } } : n);
            } catch (error) {
              failed++;
              failureReason = error instanceof Error ? error.message : 'Evaluation failed.';
            }
          }
          if (failed) message = `Ideas saved. Auto-evaluation failed for ${failed} of ${added.length} ideas. You can retry with the gavel button. ${failureReason}`;
        }
      }
    } catch (e) { message = e instanceof Error ? e.message : 'Something went wrong.'; } finally { busy = ''; activeIdeaAction = null; }
  }
  function addSeed() { if (!seed.trim() || !active) return; if (seedMode === 'ai') void run('seed'); else { addIdeas([{ title: seed.trim().slice(0, 70), description: seed.trim() }], 'seed'); seed = ''; } }
  function updateIdea(patch: Partial<IdeaNode['data']>) { nodes = nodes.map(n => n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n); }
  function cardAction(id: string, role: 'branch' | 'judge') { const node = nodes.find(n => n.id === id); if (node) void run(role, [node], false); }
  setContext<IdeaActions>(ideaActionsKey, { deleteIdea, branchIdea: id => cardAction(id, 'branch'), evaluateIdea: id => cardAction(id, 'judge'), isBusy: () => !!busy, isExpanded: id => expandedIdeaId === id, evaluationColorsEnabled: () => settings.evaluationColors, isRunning: (id, role) => activeIdeaAction?.id === id && activeIdeaAction.role === role });
  function deleteIdea(id = selectedId) {
    if (busy) return;
    nodes = nodes.filter(n => n.id !== id);
    edges = edges.filter(e => e.source !== id && e.target !== id);
    if (selectedId === id) selectedId = '';
    if (expandedIdeaId === id) expandedIdeaId = '';
    if (combineTarget === id) combineTarget = '';
  }
  function connect(c: Connection) { if (c.source !== c.target && !edges.some(e => e.source === c.source && e.target === c.target)) edges = [...edges, { ...c, id: crypto.randomUUID() }]; }
  function download(content: string, name: string, type = 'application/json') { const url = URL.createObjectURL(new Blob([content], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function exportBoards() { syncBoard(); download(JSON.stringify({ version: 1, boards }, null, 2), 'idea-garden-backup.json'); }
  function validateBoards(value: unknown): Board[] {
    if (!Array.isArray(value) || value.length > 100 || !value.every(b => b && typeof b.id === 'string' && typeof b.title === 'string' && typeof b.goal === 'string' && Array.isArray(b.nodes) && b.nodes.length <= 2000 && Array.isArray(b.edges) && b.nodes.every((n: any) => typeof n.id === 'string' && Number.isFinite(n.position?.x) && Number.isFinite(n.position?.y) && typeof n.data?.title === 'string' && typeof n.data?.description === 'string' && ['seed','branch','cross'].includes(n.data.kind) && (!n.data.verdict || ['originality','feasibility','impact'].every(k => Number.isInteger(n.data.verdict[k]) && n.data.verdict[k] >= 1 && n.data.verdict[k] <= 5)) && (!n.data.verdict || (typeof n.data.verdict.reason === 'string' && Array.isArray(n.data.verdict.keywords) && n.data.verdict.keywords.every((k: unknown) => typeof k === 'string')))) && b.edges.every((e: any) => typeof e.id === 'string' && b.nodes.some((n:any) => n.id === e.source) && b.nodes.some((n:any) => n.id === e.target)))) throw new Error('This file is not a valid Idea Garden backup.');
    if (new Set(value.map(b => b.id)).size !== value.length || value.some(b => new Set(b.nodes.map((n:any) => n.id)).size !== b.nodes.length)) throw new Error('Duplicate IDs in board backup.');
    return value.map(b => ({ id: b.id, title: b.title, goal: b.goal, created: typeof b.created === 'string' ? b.created : new Date().toISOString(), summary: typeof b.summary === 'string' ? b.summary : undefined, nodes: b.nodes.map((n:any) => ({ id: n.id, type: 'idea', position: n.position, data: { title: n.data.title, description: n.data.description, kind: n.data.kind, starred: !!n.data.starred, verdict: n.data.verdict } })), edges: b.edges.map((e:any) => ({ id: e.id, source: e.source, target: e.target })) }));
  }
  async function importBoards(event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; try { if (file.size > 10000000) throw new Error('Backup must be smaller than 10 MB.'); const data = JSON.parse(await file.text()); const imported = validateBoards(data.boards); syncBoard(); const copies = imported.map(b => ({ ...b, id: crypto.randomUUID() })); boards = [...boards, ...copies]; boardStorageReady = true; if (copies.length) switchBoard(copies[0].id); message = 'Boards imported successfully.'; } catch(e) { message = e instanceof Error ? e.message : 'Import failed.'; } (event.target as HTMLInputElement).value = ''; }
  function exportBrief() { if (!selected || !active) return; download(`# ${selected.data.title}\n\n## Goal\n${active.goal}\n\n## Idea\n${selected.data.description}\n\n## Jury\n${selected.data.verdict ? `${score(selected.data.verdict)}/15 — ${selected.data.verdict.reason}` : 'Not yet evaluated'}\n\n## Parent ideas\n${edges.filter(e => e.target === selected.id).map(e => '- ' + nodes.find(n => n.id === e.source)?.data.title).join('\n')}\n\n## Next steps\n- Validate the core problem with potential users.\n- Define the smallest useful prototype.\n- Choose one measurable success criterion.\n`, 'project-brief.md', 'text/markdown'); }
</script>

<svelte:head><title>Idea Garden · A little curiosity goes a long way</title><meta name="description" content="A local-first AI idea board. Plant, branch, combine, and discover your next great idea."/></svelte:head>
<div class="app-shell">
 <aside class="sidebar">
  <a class="brand" href="/"><span class="brand-icon"><Sprout size={24}/></span><span>idea<span class="brand-light">garden</span><small>ROOM TO THINK.</small></span></a>
  <button class="btn btn-primary new-board" aria-label="New workspace" title="New workspace" onclick={() => { newTitle = ''; newGoal = ''; showNew = true; }} disabled={!!busy}><Plus size={17}/><span>New workspace</span></button>
  <div class="sidebar-label">YOUR WORKSPACES <span>{boards.length.toString().padStart(2,'0')}</span></div>
  <nav class="board-list" aria-label="Workspaces">{#each boards as board}<div class="board-row"><button class="board-link" class:active={activeId === board.id} title={board.title} disabled={!!busy} onclick={() => switchBoard(board.id)}><LayoutGrid size={17}/><span>{board.title}<small>{(board.id === activeId ? nodes : board.nodes).length} ideas growing</small></span></button><button type="button" class="workspace-delete" aria-label={`Delete workspace: ${board.title}`} title="Delete workspace" disabled={!!busy} onclick={() => requestDeleteWorkspace(board.id)}><Trash2 size={13}/></button></div>{/each}</nav>
  <div class="sidebar-note"><span>✳</span><p>Big things start<br/>with a small <em>what if.</em></p></div>
  <div class="sidebar-bottom"><div class="sidebar-actions" role="group" aria-label="Workspace tools"><span class="tooltip tooltip-top tooltip-start max-md:tooltip-right" data-tip="Import boards"><button type="button" class="sidebar-icon-button" aria-label="Import boards" onclick={() => importInput.click()} disabled={!!busy}><Upload size={18}/></button></span><span class="tooltip tooltip-top max-md:tooltip-right" data-tip="Export workspace"><button type="button" class="sidebar-icon-button" aria-label="Export workspace" onclick={exportBoards}><Download size={18}/></button></span><span class="tooltip tooltip-top max-md:tooltip-right" data-tip="Settings"><button type="button" class="sidebar-icon-button" aria-label="Settings" onclick={() => openSettings()}><SettingsIcon size={18}/></button></span><ThemePicker bind:theme={settings.theme} iconOnly/></div></div>
 </aside>
 <main>
  <header class="topbar"><div class="breadcrumbs-label">Workspace <span>/</span> {#if renamingBoard && active}<form class="board-title-editor" onsubmit={(event) => { event.preventDefault(); saveBoardTitle(); }}><input bind:this={boardTitleInput} class="input input-sm" aria-label="Board title" bind:value={boardTitleDraft} required maxlength="100" disabled={!!busy} onkeydown={(event) => { if (event.key === 'Escape') { event.preventDefault(); renamingBoard = false; } }}/><button type="submit" class="btn btn-ghost btn-xs btn-square" aria-label="Save board title" disabled={!!busy}><Check size={14}/></button><button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Cancel board rename" onclick={() => renamingBoard = false}><X size={14}/></button></form>{:else}<h1 class="header-board-title" title={active?.title}>{active?.title || 'Your workspaces'}</h1>{#if active}<button type="button" class="edit-board" aria-label="Rename board" title="Rename board" disabled={!!busy} onclick={renameBoard}><Pencil size={13}/></button>{/if}{/if}</div><div class="topbar-actions"><span class="saved-label"><Check size={13}/>{storageError ? 'Save issue' : 'Saved on this device'}</span><button class="btn btn-ghost btn-sm" onclick={exportBoards} aria-label="Export boards"><Download size={17}/></button>{#if active && settings.ideaView === 'sidebar'}<button class="btn btn-ghost btn-sm" onclick={() => inspector = !inspector} aria-label="Toggle idea inspector"><PanelRightClose size={18}/></button>{/if}<span class="avatar-mark">K</span></div></header>
  {#if active}

  <div class="board-toolbar"><div class="toolbar-tabs"><button class:current={!onlyStarred} onclick={() => onlyStarred = false}><LayoutGrid size={15}/>All ideas <span>{nodes.length}</span></button><button class:current={onlyStarred} onclick={() => onlyStarred = true}><Star size={15}/>Saved <span>{nodes.filter(n => n.data.starred).length}</span></button></div><div class="toolbar-right"><button type="button" class="btn btn-ghost btn-sm board-summary" aria-label="Board summary" title="Board summary" disabled={!!busy || !nodes.length} onclick={() => run('summary')}><FileText size={15}/><span>Board summary</span></button><span class="gold-count">✧ {totalGold} gold</span><label class="search-box"><Search size={15}/><input placeholder="Find an idea…" aria-label="Find an idea" bind:value={search}/></label></div></div>
  <div class="board-body" class:with-inspector={inspector && settings.ideaView === 'sidebar'}>
   <section class="graph-area" aria-label="Interactive idea graph">
    {#if ready}{#key activeId}<SvelteFlow bind:nodes bind:edges {nodeTypes} colorMode={flowColorMode} fitView minZoom={0.15} maxZoom={1.8} onnodeclick={({node}) => openIdea(node.id, true)} onconnect={connect} nodesDraggable={!busy} nodesConnectable={!busy} elementsSelectable={true} deleteKey={null} defaultEdgeOptions={{ style: 'stroke: var(--graph-edge); stroke-width: 2;', type: 'default' }}><Background gap={24} size={1} patternColor="var(--graph-dot)"/><Controls/><MiniMap pannable zoomable nodeColor="var(--color-primary)" maskColor="var(--minimap-mask)"/></SvelteFlow>{/key}{/if}
    {#if !nodes.length}<div class="empty-board"><span><Sprout size={38}/></span><h2>A fresh patch of possibility.</h2><p>Plant your first thought below.<br/>You can add an idea yourself or let AI shape it.</p></div>{/if}
    {#if search || onlyStarred}<div class="search-results"><strong>{matches.length} matching ideas</strong>{#each matches as n}<button onclick={() => openIdea(n.id, true)}>{n.data.title}<span>↗</span></button>{/each}</div>{/if}
    <div class="graph-hint">DRAG TO EXPLORE <span>·</span> SCROLL TO ZOOM <span>·</span> CONNECT THE DOTS</div>
    <div class="seed-composer"><div class="composer-title"><Sprout size={16}/><span>Plant a thought</span><select aria-label="Seed mode" bind:value={seedMode}><option value="manual">Write it myself</option><option value="ai">Shape with AI</option></select></div><form onsubmit={(e) => { e.preventDefault(); addSeed(); }}><input bind:value={seed} aria-label="Your seed idea" placeholder="What if there was a better way to…" maxlength={6000} disabled={!!busy}/><button type="submit" class="btn btn-primary btn-square" aria-label="Add seed idea" disabled={!!busy || !seed.trim()}>{#if busy === 'seed'}<span class="loading loading-spinner loading-xs"></span>{:else}<ArrowUp size={20}/>{/if}</button></form><div class="composer-foot"><span>One thought. Endless directions.</span><button onclick={() => openSettings('models')}>{seedModel.replace(':', ' / ')}<ChevronDown size={12}/></button></div></div>
   </section>
   {#if inspector && settings.ideaView === 'sidebar'}<aside class="inspector"><div class="inspector-header"><span class="eyebrow">IDEA DETAILS</span><button class="btn btn-ghost btn-xs btn-square" aria-label="Close idea details" onclick={() => inspector = false}><X size={16}/></button></div>
    {#if selected}{@render ideaDetails()}
    {:else}<div class="inspector-empty"><div class="orbit-illustration"><span>✳</span><i></i><b>✧</b></div><h2>Follow a little curiosity.</h2><p>Select an idea to explore its details, grow new branches, or combine it with something unexpected.</p><div class="how-it-works"><span><i>01</i>Plant a thought</span><span><i>02</i>Branch & combine</span><span><i>03</i>Find the gold</span></div><small>GOOD IDEAS RARELY GROW ALONE.</small></div>{/if}
   </aside>{/if}
  </div>
  {:else}<section class="workspace-empty" aria-label="Get started"><div class="workspace-empty-icon"><GrowingSprout/></div><span class="eyebrow">A FRESH START</span><h1>Your next idea starts here.</h1><p>Create a workspace to give your ideas a place to grow.</p><button type="button" class="btn btn-primary btn-lg" onclick={() => { newTitle = ''; newGoal = ''; showNew = true; }}><Plus size={20}/>Create your first workspace</button><button type="button" class="btn btn-ghost btn-sm mt-3" onclick={() => importInput.click()}><Upload size={15}/>Import existing workspaces</button></section>{/if}
  <footer class="statusbar"><span><span class="live-dot"></span>{busy ? `Working on ${busy}…` : 'A little curiosity goes a long way.'}</span><span>{nodes.length} ideas <span>·</span> {edges.length} connections</span></footer>
 </main>
</div>
<input type="file" accept="application/json,.json" class="hidden" bind:this={importInput} onchange={importBoards}/>
{#if message || storageError}<div class="toast toast-bottom toast-center"><div class="alert shadow-lg"><span>{storageError || message}</span><button class="btn btn-ghost btn-xs" aria-label="Dismiss notification" onclick={() => { message = ''; storageError = ''; }}><X size={15}/></button></div></div>{/if}
{#if showSettings}<SettingsView bind:settings {vault} initialTab={settingsTab} focusRole={settingsFocusRole} generationBusy={!!busy} onboardsettings={active ? openBoardSettings : undefined} onclose={closeSettings}/>{/if}
<dialog bind:this={ideaDialog} class="modal" aria-label="Idea details" onclose={() => ideaModalOpen = false}>
  {#if settings.ideaView === 'modal' && ideaModalOpen && selected}
  <div class="modal-box idea-details-modal"><div class="inspector-header"><span class="eyebrow">IDEA DETAILS</span><button type="button" class="btn btn-ghost btn-sm btn-square" aria-label="Close idea details" onclick={() => ideaModalOpen = false}><X size={18}/></button></div>{@render ideaDetails()}</div>
  <form method="dialog" class="modal-backdrop"><button aria-label="Dismiss idea details">close</button></form>
  {/if}
</dialog>
{#if showNew}<div class="modal modal-open" role="dialog" aria-modal="true" aria-label="New workspace"><form class="modal-box" onsubmit={(e) => { e.preventDefault(); makeBoard(); }}><div class="section-heading"><div><span class="eyebrow">A NEW BEGINNING</span><h2>Create a workspace.</h2></div><button type="button" class="btn btn-ghost btn-sm btn-square" aria-label="Close new workspace" onclick={() => showNew = false}><X size={20}/></button></div><label class="field mt-5">Workspace name<input class="input w-full" bind:value={newTitle} required maxlength="100" placeholder="The next small thing"/></label><label class="field">What are we working toward?<textarea class="textarea w-full" bind:value={newGoal} required maxlength="4000" rows="4" placeholder="A clear goal gives every branch a direction."></textarea></label><div class="modal-action"><button class="btn btn-primary" type="submit"><Plus size={17}/>Create workspace</button></div></form></div>{/if}
{#if showSummary && active}<div class="modal modal-open" role="dialog" aria-modal="true" aria-label="Board summary"><div class="modal-box"><div class="section-heading"><h2>Board summary</h2><button class="btn btn-ghost btn-sm btn-square" aria-label="Close summary" onclick={() => showSummary = false}><X size={20}/></button></div><div class="summary-text">{active.summary}</div><div class="modal-action"><button class="btn btn-outline" onclick={() => download(active!.summary || '', 'board-summary.md', 'text/markdown')}>Export Markdown</button></div></div></div>{/if}
{#if showEditBoard && active}<div class="modal modal-open" role="dialog" aria-modal="true" aria-label="Edit board"><form class="modal-box" onsubmit={(e) => { e.preventDefault(); if (!newTitle.trim() || !newGoal.trim()) return; active.title = newTitle.trim(); active.goal = newGoal.trim(); showEditBoard = false; newTitle = ''; newGoal = ''; }}><div class="section-heading"><h2>A little direction.</h2><button type="button" class="btn btn-ghost btn-sm btn-square" aria-label="Close board settings" onclick={() => { showEditBoard = false; newTitle = ''; newGoal = ''; }}><X size={20}/></button></div><label class="field mt-5">Workspace name<input class="input w-full" bind:value={newTitle} required maxlength="100"/></label><label class="field">Board goal<textarea class="textarea w-full" bind:value={newGoal} required maxlength="4000" rows="4"></textarea></label><div class="modal-action justify-between"><button type="button" class="btn btn-ghost text-error" onclick={() => { showEditBoard = false; requestDeleteWorkspace(active.id); }}>Delete workspace</button><button class="btn btn-primary" type="submit">Save board</button></div></form></div>{/if}

{#snippet ideaDetails()}{#if selected}<div class="inspector-content"><div class="detail-kind"><Sprout size={16}/>{selected.data.kind} idea<button class="btn btn-ghost btn-xs btn-square ml-auto" aria-label="Save idea" onclick={() => updateIdea({ starred: !selected.data.starred })}><Star size={17} fill={selected.data.starred ? 'currentColor' : 'none'}/></button></div><label class="field">Title<input class="input w-full" value={selected.data.title} onchange={(e) => updateIdea({ title: e.currentTarget.value })}/></label><label class="field">The idea<textarea class="textarea w-full" rows="6" value={selected.data.description} onchange={(e) => updateIdea({ description: e.currentTarget.value })}></textarea></label><div class="detail-divider"></div><span class="eyebrow">FOLLOW THE POSSIBILITY</span><button class="btn btn-primary w-full mt-4" disabled={!!busy} onclick={() => run('branch', [selected])}><GitBranch size={17}/>Branch into 3 ideas</button><div class="combine-box"><select class="select select-sm w-full" aria-label="Idea to combine with" bind:value={combineTarget}><option value="">Choose another idea…</option>{#each nodes.filter(n => n.id !== selectedId) as n}<option value={n.id}>{n.data.title}</option>{/each}</select><button class="btn btn-outline btn-sm w-full mt-2" disabled={!!busy || !nodes.some(n => n.id === combineTarget && n.id !== selectedId)} onclick={() => run('cross', [selected, nodes.find(n => n.id === combineTarget)!])}><Combine size={16}/>Combine ideas</button></div><div class="detail-divider"></div><div class="jury-heading"><div class="jury-label"><span class="eyebrow">THE JURY</span><span class="tooltip tooltip-top" data-tip="Choose a separate jury model"><button type="button" class="btn btn-ghost btn-xs btn-square" aria-label="Jury model settings" onclick={openJurySettings}><SettingsIcon size={14}/></button></span></div><span>{selected.data.verdict ? `${score(selected.data.verdict)} / 15` : 'Not evaluated'}</span></div>{#if selected.data.verdict}<div class="score-grid">{#each ['originality','feasibility','impact'] as criterion}<div><strong>{selected.data.verdict[criterion as 'originality'|'feasibility'|'impact']}<small>/5</small></strong><span>{criterion}</span></div>{/each}</div><p class="jury-reason">{selected.data.verdict.reason}</p>{:else}<p class="muted text-sm my-3">A fresh perspective on originality, feasibility, and impact.</p>{/if}<button class="btn btn-outline btn-sm w-full" disabled={!!busy} onclick={() => run('judge', [selected])}><Gavel size={15}/>{selected.data.verdict ? 'Ask the jury again' : 'Evaluate this idea'}</button><div class="detail-divider"></div><button class="btn btn-ghost btn-sm w-full justify-start" onclick={exportBrief}><Download size={15}/>Export project brief</button><button class="btn btn-ghost btn-sm w-full justify-start text-error" disabled={!!busy} onclick={() => deleteIdea()}><Trash2 size={15}/>Delete idea</button></div>{/if}{/snippet}

{#if deleteTarget}<DeleteWorkspaceDialog title={deleteTarget.title} ideaCount={deleteTarget.id === activeId ? nodes.length : deleteTarget.nodes.length} onconfirm={() => deleteWorkspace(deleteTarget.id)} onclose={() => deleteBoardId = ''}/>{/if}
{#if showUnlock}<UnlockVaultDialog {vault} onunlock={(keys) => { settings.keys = keys; showUnlock = false; }} onclose={() => showUnlock = false}/>{/if}
