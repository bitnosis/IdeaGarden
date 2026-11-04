import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { seedExample } from './test-fixtures.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await seedExample(page);
await page.addInitScript(() => {
  if (!localStorage.getItem('idea-garden-settings')) localStorage.setItem('idea-garden-settings', JSON.stringify({ roleModels: { judge: 'ollama:test-jury' } }));
});
const calls = [], errors = [];
let batch = 0, failTitle = '', release;
page.on('pageerror', e => errors.push(e.message));
await page.route('**/api/generate', async route => {
  const input = route.request().postDataJSON(); calls.push(input);
  if (input.role === 'judge') {
    const idea = JSON.parse(input.context)[0];
    if (release) { const gate = release; release = null; await gate; }
    if (idea.title === failTitle) return route.fulfill({ status: 500, json: { error: 'Jury unavailable.' } });
    return route.fulfill({ json: { verdict: { originality: 4, feasibility: 4, impact: 4, reason: 'Automatic jury.', keywords: ['test'] } } });
  }
  batch++;
  return route.fulfill({ json: { ideas: Array.from({ length: input.role === 'branch' ? 3 : 1 }, (_, i) => ({ title: `Generated ${batch}-${i}`, description: `New ${input.role} idea.` })) } });
});
const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
async function toggle(on) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await settings.getByRole('checkbox', { name: 'Auto-evaluate', exact: true }).setChecked(on);
  await settings.getByRole('button', { name: 'Done', exact: true }).click();
  await settings.waitFor({ state: 'hidden' });
}
async function generateSeed() {
  await page.getByLabel('Seed mode', { exact: true }).selectOption('ai');
  await page.getByLabel('Your seed idea', { exact: true }).fill('A new idea');
  await page.getByRole('button', { name: 'Add seed idea', exact: true }).click();
}
const card = title => page.locator('.idea-node').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
try {
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:4340');
  await page.locator('.idea-node').first().waitFor();
  await generateSeed();
  await expect(page.getByLabel('Your seed idea', { exact: true })).toBeEnabled();
  assert.deepEqual(calls.map(c => c.role), ['seed']);
  await toggle(true);
  await page.reload(); await page.locator('.idea-node').first().waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('idea-garden-settings')).autoEvaluate), true);
  let unblock; release = new Promise(resolve => unblock = resolve);
  await generateSeed();
  await expect(card('Generated 2-0')).toBeVisible();
  await card('Generated 2-0').locator('.loading-spinner').waitFor();
  await expect(card('Generated 2-0').getByRole('button', { name: /^Branch idea:/ })).toBeDisabled();
  unblock();
  await expect(card('Generated 2-0').locator('.node-score')).toHaveText('12 / 15');
  const judge = calls.find(c => c.role === 'judge');
  assert.equal(judge.provider, 'ollama'); assert.equal(judge.model, 'test-jury');
  failTitle = 'Generated 3-1';
  await card('Generated 2-0').getByRole('button', { name: /^Branch idea:/ }).click();
  await expect(card('Generated 3-2').locator('.node-score')).toHaveText('12 / 15');
  await page.getByText(/Ideas saved\. Auto-evaluation failed for 1 of 3 ideas/).waitFor();
  await expect(card(failTitle).locator('.node-score')).toHaveText('Unscored');
  assert.equal(calls.filter(c => c.role === 'judge').length, 4);
  await page.getByLabel('Idea to combine with', { exact: true }).selectOption({ label: 'Generated 1-0' });
  await page.getByRole('button', { name: 'Combine ideas', exact: true }).click();
  await expect(card('Generated 4-0').locator('.node-score')).toHaveText('12 / 15');
  assert.equal(calls.filter(c => c.role === 'judge').length, 5);
  await toggle(false);
  await generateSeed();
  await expect(card('Generated 5-0')).toBeVisible();
  await expect(page.getByLabel('Your seed idea', { exact: true })).toBeEnabled();
  assert.equal(calls.filter(c => c.role === 'judge').length, 5);
  await page.reload(); await page.locator('.idea-node').first().waitFor();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('idea-garden-settings')).autoEvaluate), false);
  assert.deepEqual(errors, []);
  console.log('Auto-evaluation passed: default off, persisted toggle, seed/branch/cross scoring, Jury override, visible progress, failure recovery, retained ideas, and disabling.');
} finally { await browser.close(); }


