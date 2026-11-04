import { describe, expect, it } from 'vitest';
import { defaultSettings } from './types';
import { createEncryptedVault, decryptVault, encryptKeys, parseVault } from './vault-crypto';
import { loadSettings, persistSettings, SETTINGS_STORAGE_KEY } from './settings-storage';
import { createKeyVault } from './key-vault.svelte';
import { VAULT_STORAGE_KEY } from './vault-crypto';
const password = 'a long test password 2026';
const keys = { ...defaultSettings().keys, openrouter: 'test-private-key', openai: 'another-private-key' };
function memoryStorage(): Storage {
  const data = new Map<string,string>();
  return { get length() { return data.size; }, clear: () => data.clear(), getItem: key => data.get(key) ?? null, key: i => [...data.keys()][i] ?? null, removeItem: key => { data.delete(key); }, setItem: (key, value) => { data.set(key, value); } };
}
describe('encrypted API key vault', () => {
  it('round-trips keys using a non-extractable session key, storing no plaintext', async () => {
    const saved = await createEncryptedVault(keys, password);
    expect(saved.key.extractable).toBe(false);
    const raw = JSON.stringify(saved.envelope);
    expect(raw).not.toContain('test-private-key');
    expect(raw).not.toContain(password);
    expect((await decryptVault(raw, password)).keys).toEqual(keys);
  });
  it('uses fresh salts for vaults and fresh IVs for every save', async () => {
    const a = await createEncryptedVault(keys, password), b = await createEncryptedVault(keys, password);
    expect(a.envelope.salt).not.toBe(b.envelope.salt);
    const updated = await encryptKeys(keys, a.key, a.envelope.salt);
    expect(updated.iv).not.toBe(a.envelope.iv);
    expect(updated.ciphertext).not.toBe(a.envelope.ciphertext);
    expect((await decryptVault(JSON.stringify(updated), password)).keys).toEqual(keys);
  });
  it('rejects wrong passwords and modified ciphertext', async () => {
    const { envelope } = await createEncryptedVault(keys, password);
    await expect(decryptVault(JSON.stringify(envelope), 'wrong password')).rejects.toThrow('Could not unlock');
    const bytes = Uint8Array.from(atob(envelope.ciphertext), c => c.charCodeAt(0)); bytes[0] ^= 1;
    const damaged = { ...envelope, ciphertext: btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')) };
    await expect(decryptVault(JSON.stringify(damaged), password)).rejects.toThrow('Could not unlock');
  });
  it('rejects unsupported metadata, malformed records and short passwords', async () => {
    const { envelope } = await createEncryptedVault(keys, password);
    for (const data of [{ ...envelope, iterations: 1 }, { ...envelope, version: 2 }, { ...envelope, iv: 'bad' }, { ...envelope, salt: 'bad' }]) expect(() => parseVault(JSON.stringify(data))).toThrow('unsupported format');
    expect(() => parseVault('not JSON')).toThrow();
    await expect(createEncryptedVault(keys, 'short')).rejects.toThrow('12 characters');
  });
});
describe('settings migration', () => {
  it('never persists keys through ordinary settings saves', () => {
    const storage = memoryStorage();
    persistSettings(storage, { ...defaultSettings(), keys });
    const stored = storage.getItem(SETTINGS_STORAGE_KEY)!;
    expect(stored).not.toContain('private-key');
    expect(JSON.parse(stored).keys).toBeUndefined();
  });
  it('migrates previously remembered plaintext keys to memory without losing preferences', () => {
    const storage = memoryStorage();
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...defaultSettings(), keys, rememberKeys: true, theme: 'omp' }));
    const result = loadSettings(storage);
    expect(result.migrated).toBe(true);
    expect(result.settings.keys).toEqual(keys);
    expect(result.settings.theme).toBe('omp');
    expect(storage.getItem(SETTINGS_STORAGE_KEY)).not.toContain('private-key');
    expect(loadSettings(storage).settings.keys).toEqual(defaultSettings().keys);
  });
});
describe('vault storage lifecycle', () => {
  it('starts locked after reload and leaves keys locked after a wrong password', async () => {
    const storage = memoryStorage(), vault = createKeyVault(); vault.initialize(storage);
    await vault.save(keys, password);
    const reloaded = createKeyVault(); reloaded.initialize(storage);
    expect(reloaded.state.exists).toBe(true); expect(reloaded.state.unlocked).toBe(false);
    await expect(reloaded.unlock('incorrect')).rejects.toThrow();
    expect(reloaded.state.unlocked).toBe(false);
    expect(await reloaded.unlock(password)).toEqual(keys);
    reloaded.lock(); expect(reloaded.state.saved).toBe(''); expect(reloaded.state.unlocked).toBe(false);
  });
  it('does not overwrite another tab’s vault', async () => {
    const storage = memoryStorage(), vault = createKeyVault(); vault.initialize(storage);
    await vault.save(keys, password);
    const other = createKeyVault(); other.initialize(storage); await other.unlock(password);
    await vault.save({ ...keys, openai: 'newer-key' });
    const latest = storage.getItem(VAULT_STORAGE_KEY);
    await expect(other.save(keys)).rejects.toThrow('another tab');
    expect(storage.getItem(VAULT_STORAGE_KEY)).toBe(latest);
  });
  it('keeps the existing vault intact when browser storage refuses a save', async () => {
    const storage = memoryStorage(), vault = createKeyVault(); vault.initialize(storage);
    await vault.save(keys, password);
    const saved = storage.getItem(VAULT_STORAGE_KEY);
    storage.setItem = () => { throw new Error('Storage is full.'); };
    const changed = { ...keys, openai: 'unsaved-key' };
    await expect(vault.save(changed)).rejects.toThrow('Storage is full');
    expect(storage.getItem(VAULT_STORAGE_KEY)).toBe(saved);
    expect(vault.dirty(changed)).toBe(true);
    expect((await decryptVault(saved!, password)).keys).toEqual(keys);
  });
});
