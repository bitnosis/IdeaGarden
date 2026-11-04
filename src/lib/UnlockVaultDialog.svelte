<script lang="ts">
  import { onMount } from 'svelte';
  import { LockKeyhole, UnlockKeyhole, X } from '@lucide/svelte';
  import type { KeyVault } from './key-vault.svelte';
  import type { ApiKeys } from './vault-crypto';
  let { vault, onunlock, onclose }: { vault: KeyVault; onunlock: (keys: ApiKeys) => void; onclose: () => void } = $props();
  let password = $state('');
  let dialog: HTMLDialogElement, passwordInput: HTMLInputElement;
  onMount(() => { dialog.showModal(); passwordInput.focus(); });
  async function unlock() {
    if (!password || vault.state.busy) return;
    try { onunlock(await vault.unlock(password)); }
    catch { /* The vault supplies a safe error message without exposing secrets. */ }
    finally { password = ''; }
  }
</script>
<dialog bind:this={dialog} class="modal" aria-label="Unlock saved keys" onclose={onclose} oncancel={(event) => { if (vault.state.busy) event.preventDefault(); }}>
  <form class="modal-box max-w-sm" onsubmit={(event) => { event.preventDefault(); void unlock(); }}>
    <div class="flex items-center gap-2 mb-5"><LockKeyhole size={20} class="text-primary"/><h2 class="text-lg font-semibold">Unlock your keys</h2><button type="button" class="btn btn-ghost btn-sm btn-square ml-auto" aria-label="Close unlock prompt" disabled={vault.state.busy} onclick={() => dialog.close()}><X size={18}/></button></div>
    <label class="field">Password<input bind:this={passwordInput} type="password" class="input w-full" autocomplete="current-password" bind:value={password} required disabled={vault.state.busy}/></label>
    {#if vault.state.error}<p class="text-xs text-error mb-4" role="alert">{vault.state.error}</p>{/if}
    <button type="submit" class="btn btn-primary w-full" disabled={vault.state.busy}><UnlockKeyhole size={16}/>{vault.state.busy ? 'Unlocking…' : 'Unlock'}</button>
  </form>
  <form method="dialog" class="modal-backdrop"><button aria-label="Dismiss unlock prompt" disabled={vault.state.busy}>close</button></form>
</dialog>
