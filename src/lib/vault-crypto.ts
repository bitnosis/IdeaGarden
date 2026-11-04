import { providers, type Provider } from './types';
export type ApiKeys = Record<Provider, string>;
export type VaultEnvelope = { version: 1; kdf: 'PBKDF2-SHA256'; iterations: 600000; cipher: 'AES-256-GCM'; salt: string; iv: string; ciphertext: string };
export const VAULT_STORAGE_KEY = 'idea-garden-key-vault';
const aad = new TextEncoder().encode('idea-garden-api-key-vault:v1');
const iterations = 600000;
function encode(bytes: Uint8Array) { return btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')); }
function decode(text: string): Uint8Array<ArrayBuffer> { return Uint8Array.from(atob(text), c => c.charCodeAt(0)); }
export function cleanKeys(value: unknown): ApiKeys {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid API key data.');
  const result = {} as ApiKeys;
  for (const p of providers) {
    const key = (value as Record<string, unknown>)[p];
    if (typeof key !== 'string' || key.length > 8000) throw new Error('Invalid API key data.');
    result[p] = key;
  }
  return result;
}
export function parseVault(raw: string): VaultEnvelope {
  try {
    if (raw.length > 60000) throw new Error();
    const data = JSON.parse(raw);
    if (data.version !== 1 || data.kdf !== 'PBKDF2-SHA256' || data.iterations !== iterations || data.cipher !== 'AES-256-GCM' || !['salt', 'iv', 'ciphertext'].every(k => typeof data[k] === 'string')) throw new Error();
    if (decode(data.salt).length !== 16 || decode(data.iv).length !== 12 || decode(data.ciphertext).length < 16) throw new Error();
    return { version: 1, kdf: 'PBKDF2-SHA256', iterations, cipher: 'AES-256-GCM', salt: data.salt, iv: data.iv, ciphertext: data.ciphertext };
  } catch { throw new Error('The saved API key vault is damaged or uses an unsupported format.'); }
}
async function derive(password: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function encryptKeys(keys: ApiKeys, key: CryptoKey, salt: string): Promise<VaultEnvelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad, tagLength: 128 }, key, new TextEncoder().encode(JSON.stringify(cleanKeys(keys))));
  return { version: 1, kdf: 'PBKDF2-SHA256', iterations, cipher: 'AES-256-GCM', salt, iv: encode(iv), ciphertext: encode(new Uint8Array(ciphertext)) };
}
export async function createEncryptedVault(keys: ApiKeys, password: string) {
  if (password.length < 12) throw new Error('Use a vault password with at least 12 characters.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await derive(password, salt);
  return { key, envelope: await encryptKeys(keys, key, encode(salt)) };
}
export async function decryptVault(raw: string, password: string) {
  const envelope = parseVault(raw);
  try {
    const key = await derive(password, decode(envelope.salt));
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(envelope.iv), additionalData: aad, tagLength: 128 }, key, decode(envelope.ciphertext));
    return { key, envelope, keys: cleanKeys(JSON.parse(new TextDecoder().decode(plain))) };
  } catch { throw new Error('Could not unlock the vault. Check your password; the saved data may also have been modified.'); }
}
