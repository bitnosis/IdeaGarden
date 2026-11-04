import { createEncryptedVault, decryptVault, encryptKeys, parseVault, cleanKeys, VAULT_STORAGE_KEY, type ApiKeys, type VaultEnvelope } from './vault-crypto';
export function createKeyVault() {
  const state = $state({ exists: false, unlocked: false, busy: false, error: '', saved: '' });
  let sessionKey: CryptoKey | undefined;
  let envelope: VaultEnvelope | undefined;
  let savedRecord: string | null = null;
  let storage: Storage;
  function initialize(target: Storage) {
    storage = target;
    try {
      savedRecord = storage.getItem(VAULT_STORAGE_KEY);
      state.exists = savedRecord !== null;
      if (savedRecord !== null) envelope = parseVault(savedRecord);
    } catch (error) { state.error = error instanceof Error ? error.message : 'Could not read the key vault.'; }
  }
  function unchanged() {
    if (storage.getItem(VAULT_STORAGE_KEY) !== savedRecord) throw new Error('The vault changed in another tab. Reload this page and unlock the latest vault.');
  }
  function dirty(keys: ApiKeys) { return state.unlocked && JSON.stringify(cleanKeys(keys)) !== state.saved; }
  async function save(keys: ApiKeys, password?: string) {
    if (state.busy) return;
    state.busy = true; state.error = '';
    try {
      unchanged();
      const snapshot = cleanKeys(keys);
      let next: VaultEnvelope, key: CryptoKey;
      if (state.exists) {
        if (!state.unlocked || !sessionKey || !envelope) throw new Error('Unlock the vault before saving keys.');
        key = sessionKey; next = await encryptKeys(snapshot, key, envelope.salt);
      } else {
        const created = await createEncryptedVault(snapshot, password || '');
        key = created.key; next = created.envelope;
      }
      unchanged();
      const record = JSON.stringify(next);
      storage.setItem(VAULT_STORAGE_KEY, record);
      savedRecord = record; envelope = next; sessionKey = key;
      state.exists = true; state.unlocked = true; state.saved = JSON.stringify(snapshot);
    } catch (error) { state.error = error instanceof Error ? error.message : 'Could not save the encrypted keys.'; throw error; }
    finally { state.busy = false; }
  }
  async function unlock(password: string): Promise<ApiKeys> {
    if (state.busy) throw new Error('Vault is busy.');
    state.busy = true; state.error = '';
    try {
      unchanged();
      if (!savedRecord) throw new Error('There is no saved vault to unlock.');
      const result = await decryptVault(savedRecord, password);
      unchanged();
      sessionKey = result.key; envelope = result.envelope;
      state.unlocked = true; state.saved = JSON.stringify(result.keys);
      return result.keys;
    } catch (error) { state.error = error instanceof Error ? error.message : 'Could not unlock the vault.'; throw error; }
    finally { state.busy = false; }
  }
  function lock() { sessionKey = undefined; state.unlocked = false; state.saved = ''; state.error = ''; }
  function forget() {
    if (state.busy) return;
    // Called only after the user confirms the explicit Forget action in the UI.
    unchanged();
    storage.removeItem(VAULT_STORAGE_KEY); savedRecord = null; envelope = undefined;
    lock(); state.exists = false;
  }
  return { state, initialize, dirty, save, unlock, lock, forget };
}
export type KeyVault = ReturnType<typeof createKeyVault>;
