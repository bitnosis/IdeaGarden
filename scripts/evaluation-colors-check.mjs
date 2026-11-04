import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { demoBoard } from '../src/lib/types.ts';
const board = demoBoard();
const scores = [[1,1,1], [3,3,2], [5,5,5]];
for (let i = 0; i < scores.length; i++) {
  const [originality, feasibility, impact] = scores[i];
  board.nodes[i].data.verdict = { originality, feasibility, impact, reason: 'Illustrative test score.', keywords: [] };
}
delete board.nodes[3].data.verdict;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await page.addInitScript(board => { if (!localStorage.getItem('idea-garden-boards')) localStorage.setItem('idea-garden-boards', JSON.stringify([board])); }, board);
await page.route('**/api/generate', route => route.fulfill({ json: { verdict: { originality: 2, feasibility: 2, impact: 2, reason: 'Updated score.', keywords: [] } } }));
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:4340'); await page.locator('.idea-node').first().waitFor();
  const cards = page.locator('.idea-node');
  await expect(page.locator('.score-colored')).toHaveCount(3);
  const hues = await cards.evaluateAll(cards => cards.map(card => card.style.getPropertyValue('--evaluation-color')));
  assert.deepEqual(hues, ['hsl(24 72% 45%)', 'hsl(64 72% 45%)', 'hsl(120 72% 45%)', '']);
  const colors = await cards.evaluateAll(cards => cards.slice(0,3).map(card => getComputedStyle(card).borderColor));
  assert.equal(new Set(colors).size, 3);
  await page.screenshot({ path: 'screenshots/evaluation-colors.png', fullPage: true });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const toggle = page.getByRole('checkbox', { name: 'Evaluation colors', exact: true });
  await expect(toggle).toBeChecked(); await toggle.uncheck();
  await expect(page.locator('.score-colored')).toHaveCount(0);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload(); await cards.first().waitFor(); await expect(page.locator('.score-colored')).toHaveCount(0);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(toggle).not.toBeChecked(); await toggle.check();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('dialog', { name: 'Settings', exact: true }).waitFor({ state: 'hidden' });
  await expect(page.locator('.score-colored')).toHaveCount(3);
  await page.getByRole('button', { name: `Evaluate idea: ${board.nodes[0].data.title}`, exact: true }).click();
  await expect.poll(() => cards.first().evaluate(card => card.style.getPropertyValue('--evaluation-color'))).toBe('hsl(48 72% 45%)');
  const before = await cards.first().evaluate(card => getComputedStyle(card).borderColor);
  await page.getByRole('heading', { name: board.nodes[0].data.title, exact: true }).click();
  assert.equal(await cards.first().evaluate(card => getComputedStyle(card).borderColor), before);
  await page.reload(); await cards.first().waitFor();
  await expect(page.locator('.score-colored')).toHaveCount(3);
  assert.equal(await cards.last().evaluate(card => card.style.getPropertyValue('--evaluation-color')), '');
  assert.deepEqual(errors, []);
  console.log('Evaluation color checks passed: enabled default, score/15 gradient, neutral unscored cards, live toggle, saved off/on preference, live reevaluation, and selected-card ring color.');
} finally { await browser.close(); }
