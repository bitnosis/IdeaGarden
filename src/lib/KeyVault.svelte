<script lang="ts">
  import { LockKeyhole, UnlockKeyhole, ShieldCheck } from '@lucide/svelte';
  import type { KeyVault } from './key-vault.svelte';
  import { defaultSettings } from './types';
  import type { ApiKeys } from './vault-crypto';
  let { vault, keys = $bindable(), generationBusy = false }: { vault: KeyVault; keys: ApiKeys; generationBusy?: boolean } = $props();
  let password = $state(''), confirmPassword = $state(''), localError = $state(''), forgetConfirmed = $state(false);
  const dirty = $derived(vault.dirty(keys));
  async function save() {
    localError = '';
    if (vault.state.busy || generationBusy) return;
    if (!vault.state.exists) {
      if (!password) { localError = 'Enter a vault password to encrypt your keys.'; return; }
      if (password.length < 12) { localError = 'Your vault password must contain at least 12 characters.'; return; }
      if (!confirmPassword) { localError = 'Enter the same password in Confirm vault password.'; return; }
      if (password !== confirmPassword) { localError = 'The passwords do not match. Enter the same password in both fields.'; return; }
    }
    try { await vault.save(keys, password); password = ''; confirmPassword = ''; } catch { /* Vault supplies a safe error message. */ }
  }
  async function unlock() { localError = ''; try { keys = await vault.unlock(password); } catch { /* Shown below. */ } finally { password = ''; } }
</script>
<section class="key-vault" aria-label="Encrypted API key vault">
  <div class="flex items-center gap-2"><ShieldCheck size={18}/><h3 class="font-semibold text-sm">Encrypted key vault</h3><span class="ml-auto text-xs muted">{vault.state.exists ? vault.state.unlocked ? 'Unlocked' : 'Locked' : 'Not set up'}</span></div>
  <p class="muted text-xs leading-relaxed my-3">Keys are encrypted on this device with your vault password. The password is never saved. Unlock once after reopening the app; decrypted keys stay in memory.</p>
  {#if !vault.state.exists}
    <p class="muted text-xs mb-3">Your entered keys are currently memory-only. Save them below to keep an encrypted copy. Use a strong password—there is no password recovery.</p>
    <div class="grid sm:grid-cols-2 gap-3"><label class="field">Vault password<input type="password" class="input input-sm w-full" autocomplete="new-password" aria-label="Vault password" aria-describedby="vault-password-help" bind:value={password} disabled={vault.state.busy} minlength="12" placeholder="At least 12 characters"/><span id="vault-password-help" class="muted text-xs">12 characters minimum.</span></label><label class="field">Confirm vault password<input type="password" class="input input-sm w-full" autocomplete="new-password" bind:value={confirmPassword} disabled={vault.state.busy} onkeydown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void save(); } }}/></label></div>
    <button type="button" class="btn btn-primary btn-sm" disabled={vault.state.busy || generationBusy} onclick={save}><LockKeyhole size={14}/>{vault.state.busy ? 'Encrypting…' : 'Save encrypted keys'}</button>
  {:else if !vault.state.unlocked}
    <label class="field">Vault password<input type="password" class="input input-sm w-full" autocomplete="current-password" bind:value={password} disabled={vault.state.busy} onkeydown={(event) => { if (event.key === 'Enter' && password && !vault.state.busy) { event.preventDefault(); void unlock(); } }}/></label>
    <button type="button" class="btn btn-primary btn-sm" disabled={vault.state.busy || !password || generationBusy} onclick={unlock}><UnlockKeyhole size={14}/>{vault.state.busy ? 'Unlocking…' : 'Unlock keys'}</button>
  {:else}
    <div class="flex flex-wrap items-center gap-2"><button type="button" class="btn btn-primary btn-sm" disabled={vault.state.busy || generationBusy} onclick={save}>{vault.state.busy ? 'Encrypting…' : 'Save encrypted keys'}</button><button type="button" class="btn btn-outline btn-sm" disabled={vault.state.busy || generationBusy || dirty} onclick={() => { vault.lock(); keys = defaultSettings().keys; password = ''; confirmPassword = ''; }}><LockKeyhole size={14}/>Lock vault</button><span class="text-xs muted">{dirty ? 'Unsaved key changes—save before locking.' : 'Encrypted keys saved.'}</span></div>
  {/if}
  {#if localError || vault.state.error}<p class="text-xs text-error mt-3" role="alert">{localError || vault.state.error}</p>{/if}
  {#if generationBusy}<p class="muted text-xs mt-3" role="status">Wait for the current AI request to finish before saving keys.</p>{/if}
  {#if vault.state.exists}<details class="mt-4"><summary class="text-xs muted cursor-pointer">Forgot your password or want to remove saved keys?</summary><p class="muted text-xs leading-relaxed my-3">Forgetting this vault removes its encrypted keys and clears keys from this session. You will need to enter your provider keys again. Your boards stay saved.</p>{#if forgetConfirmed}<p class="text-xs text-error my-2">Permanently forget this encrypted vault?</p><button type="button" class="btn btn-error btn-xs" disabled={vault.state.busy || generationBusy} onclick={() => { try { vault.forget(); keys = defaultSettings().keys; forgetConfirmed = false; password = ''; confirmPassword = ''; localError = ''; } catch { localError = 'Could not remove the vault from browser storage.'; } }}>Confirm forget vault</button><button type="button" class="btn btn-ghost btn-xs" onclick={() => forgetConfirmed = false}>Cancel</button>{:else}<button type="button" class="btn btn-ghost btn-xs text-error" disabled={vault.state.busy || generationBusy} onclick={() => forgetConfirmed = true}>Forget encrypted vault</button>{/if}</details>{/if}
</section>
