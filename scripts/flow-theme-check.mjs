import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { seedExample } from './test-fixtures.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1450, height: 1000 } });
await seedExample(page);
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:4340'); await page.locator('.idea-node').first().waitFor();
  const tools = page.getByRole('group', { name: 'Workspace tools', exact: true });
  assert.equal(await tools.getByRole('button').count(), 4);
  assert.equal(await page.locator('.local-status').count(), 0);
  const rects = await Promise.all((await tools.getByRole('button').all()).map(b => b.boundingBox()));
  assert(rects.every(r => Math.abs(r.y - rects[0].y) < 1));
  for (const name of ['Import boards', 'Export workspace', 'Settings', 'Themes']) {
    await tools.getByRole('button', { name, exact: true }).hover();
    const tooltip = tools.locator(`[data-tip="${name}"]`);
    await expect.poll(() => tooltip.evaluate(el => getComputedStyle(el, '::before').opacity)).toBe('1');
  }
  const fileChooser = page.waitForEvent('filechooser');
  await tools.getByRole('button', { name: 'Import boards', exact: true }).click();
  await (await fileChooser).setFiles([]);
  const download = page.waitForEvent('download');
  await tools.getByRole('button', { name: 'Export workspace', exact: true }).click();
  const backup = JSON.parse(await readFile(await (await download).path(), 'utf8'));
  assert.equal(backup.boards.length, 1);
  await tools.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('dialog', { name: 'Settings', exact: true }).getByRole('button', { name: 'Close settings', exact: true }).click();
  await page.getByRole('dialog', { name: 'Settings', exact: true }).waitFor({ state: 'hidden' });
  for (const [theme, mode] of [['abyss','dark'], ['light','light'], ['dracula','dark'], ['garden','light'], ['omp','dark'], ['nord','light']]) {
    await tools.getByRole('button', { name: 'Themes', exact: true }).click();
    const picker = page.getByRole('dialog', { name: 'Appearance', exact: true });
    await picker.getByRole('button', { name: `Use ${theme} theme`, exact: true }).click();
    await picker.getByRole('button', { name: 'Close themes', exact: true }).click(); await picker.waitFor({ state: 'hidden' });
    await expect(page.locator('.svelte-flow')).toHaveClass(new RegExp(`\\b${mode}\\b`));
    const styles = await page.evaluate(() => {
      const style = selector => getComputedStyle(document.querySelector(selector));
      return { controls: style('.svelte-flow__controls-button').backgroundColor, minimap: style('.svelte-flow__minimap').backgroundColor, panel: style('.sidebar').backgroundColor, icon: style('.svelte-flow__controls-button').color, text: style('body').color, mask: style('.svelte-flow__minimap-mask').fill, node: style('.svelte-flow__minimap-node').fill, primary: style('.brand-icon').color };
    });
    assert.equal(styles.controls, styles.panel, `${theme}: controls background`);
    assert.equal(styles.minimap, styles.panel, `${theme}: minimap background`);
    assert.equal(styles.icon, styles.text, `${theme}: control icon contrast`);
    assert.equal(styles.node, styles.primary, `${theme}: minimap nodes`);
    assert(!['rgb(255, 255, 255)', 'rgb(240, 240, 240)'].includes(styles.mask), `${theme}: mask uses theme colors`);
    if (['abyss','light','omp'].includes(theme)) await page.screenshot({ path: `screenshots/flow-${theme}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Zoom In', exact: true }).click();
  await page.getByRole('button', { name: 'Fit View', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ['Import boards', 'Export workspace', 'Settings', 'Themes']) await expect(tools.getByRole('button', { name, exact: true })).toBeVisible();
  await tools.getByRole('button', { name: 'Themes', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Appearance', exact: true })).toBeVisible();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('Flow/theme checks passed: compact sidebar icon row, tooltips, import/export/settings/direct theme access, controls/minimap/icon colors across six light/dark/custom themes, zoom controls, and mobile layout.');
} finally { await browser.close(); }
