import { defaultSettings, providers, roles, type Settings } from './types';
import { cleanKeys } from './vault-crypto';
import { isCardFont } from './card-fonts';
export const SETTINGS_STORAGE_KEY = 'idea-garden-settings';
export function persistSettings(storage: Storage, settings: Settings) {
  // Explicit allowlist: neither API keys, passwords nor encryption keys belong here.
  const { provider, models, roleModels, ollamaUrl, theme, ideaView, evaluationColors, autoEvaluate, cardFont } = settings;
  storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ provider, models, roleModels, ollamaUrl, theme, ideaView, evaluationColors, autoEvaluate, cardFont }));
}
export function loadSettings(storage: Storage) {
  const stored = JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) || '{}');
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) throw new Error('Invalid saved settings.');
  const settings = defaultSettings();
  if (providers.includes(stored.provider)) settings.provider = stored.provider;
  if (typeof stored.ollamaUrl === 'string') settings.ollamaUrl = stored.ollamaUrl;
  if (typeof stored.theme === 'string') settings.theme = stored.theme;
  if (stored.ideaView === 'sidebar' || stored.ideaView === 'modal') settings.ideaView = stored.ideaView;
  if (typeof stored.evaluationColors === 'boolean') settings.evaluationColors = stored.evaluationColors;
  if (typeof stored.autoEvaluate === 'boolean') settings.autoEvaluate = stored.autoEvaluate;
  if (isCardFont(stored.cardFont)) settings.cardFont = stored.cardFont;
  for (const p of providers) if (typeof stored.models?.[p] === 'string') settings.models[p] = stored.models[p];
  for (const role of roles) if (typeof stored.roleModels?.[role] === 'string') settings.roleModels[role] = stored.roleModels[role];
  const migrated = stored.rememberKeys === true && stored.keys && Object.values(stored.keys).some(key => typeof key === 'string' && key.length > 0);
  if (migrated) settings.keys = cleanKeys({ ...settings.keys, ...stored.keys });
  // Remove the old plaintext copy immediately; keep legacy keys in memory for vault setup.
  persistSettings(storage, settings);
  return { settings, migrated: !!migrated };
}
