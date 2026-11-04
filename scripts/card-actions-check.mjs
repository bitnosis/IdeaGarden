import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { seedExample } from './test-fixtures.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
await seedExample(page);
const errors = [], requests = []; page.on('pageerror', error => errors.push(error.message));
let releaseJudge;
const judgeGate = new Promise(resolve => releaseJudge = resolve);
let firstJudge = true, fail = false;
await page.route('**/api/generate', async route => {
  const body = route.request().postDataJSON(); requests.push(body);
  if (firstJudge && body.role === 'judge') { firstJudge = false; await judgeGate; }
  if (fail) return route.fulfill({ status: 400, json: { error: 'Test provider failure.' } });
  return route.fulfill({ json: body.role === 'judge' ? { verdict: { originality: 4, feasibility: 4, impact: 4, reason: 'Card jury result.', keywords: ['test','card'] } } : { ideas: [1,2,3].map(i => ({ title: `Quick branch ${i}`, description: 'Created directly from the card.' })) } });
});
try {
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:4340');
  await page.locator('.idea-node').first().waitFor();
  await page.getByRole('button', { name: 'Toggle idea inspector', exact: true }).click();
  const title = 'Tiny rituals, real momentum';
  const card = page.locator('.idea-node').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
  const remove = card.getByRole('button', { name: `Delete idea: ${title}`, exact: true });
  const evaluate = card.getByRole('button', { name: `Evaluate idea: ${title}`, exact: true });
  const branch = card.getByRole('button', { name: `Branch idea: ${title}`, exact: true });
  const positions = await Promise.all([remove, evaluate, branch].map(button => button.boundingBox()));
  assert(positions[0].x < positions[1].x && positions[1].x < positions[2].x);
  for (const [button, text] of [[remove,'Delete idea'], [evaluate,'Evaluate with the jury'], [branch,'Generate 3 branches']]) {
    const tooltip = card.locator(`[data-tip="${text}"]`);
    await button.hover();
    await expect.poll(() => tooltip.evaluate(el => getComputedStyle(el, '::before').opacity)).toBe('1');
    assert((await tooltip.evaluate(el => getComputedStyle(el, '::before').content)).includes(text));
    await page.mouse.move(0, 0); await button.focus();
    await expect.poll(() => tooltip.evaluate(el => getComputedStyle(el, '::before').opacity)).toBe('1');
  }
  await page.screenshot({ path: 'screenshots/card-actions.png', fullPage: true });
  await evaluate.click();
  await expect(evaluate).toBeDisabled(); await expect(branch).toBeDisabled(); await expect(remove).toBeDisabled();
  await card.locator('.loading-spinner').waitFor();
  releaseJudge();
  await expect(card.locator('.node-score')).toHaveText('12 / 15');
  await expect(branch).toBeEnabled();
  assert.equal(await page.locator('.inspector').count(), 0);
  assert.equal(await page.getByRole('dialog', { name: 'Idea details', exact: true }).isVisible(), false);
  assert(JSON.parse(requests[0].context)[0].title === title);
  await branch.click();
  await expect(page.locator('.idea-node')).toHaveCount(7);
  assert.equal(await page.locator('.inspector').count(), 0);
  assert.equal(await page.getByRole('dialog', { name: 'Idea details', exact: true }).isVisible(), false);
  fail = true;
  await page.getByRole('button', { name: 'Evaluate idea: Make everyday life a little lighter', exact: true }).click();
  await page.getByText('Test provider failure.', { exact: true }).waitFor();
  await expect(branch).toBeEnabled();
  fail = false;
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Idea View', { exact: true }).selectOption('modal');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('dialog', { name: 'Settings', exact: true }).waitFor({ state: 'hidden' });
  await evaluate.click(); await expect(evaluate).toBeEnabled();
  assert.equal(await page.getByRole('dialog', { name: 'Idea details', exact: true }).isVisible(), false);
  assert.equal(await page.locator('.inspector').count(), 0);
  assert.deepEqual(errors, []);
  console.log('Card action checks passed: trash left, evaluate/branch right, hover/focus tooltips, target-specific requests, busy state, scoring, branching without popups, error recovery, Modal mode.');
} finally { await browser.close(); }
