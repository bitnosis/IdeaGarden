import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { seedExample } from './test-fixtures.mjs';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1300, height: 1000 } });
await seedExample(page);
const errors = []; page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:4340'); await page.locator('.idea-node').first().waitFor();
  const title = page.locator('.idea-node h3').first();
  assert((await title.evaluate(el => getComputedStyle(el).fontFamily)).includes('Georgia'));
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const font = page.getByLabel('Card font', { exact: true });
  for (const [value, family] of [['mono','Consolas'], ['modern','Segoe UI'], ['clean','Verdana'], ['classic','Palatino']]) {
    await font.selectOption(value);
    await expect.poll(() => title.evaluate(el => getComputedStyle(el).fontFamily)).toContain(family);
    assert((await page.locator('.card-font-preview').evaluate(el => getComputedStyle(el).fontFamily)).includes(family));
  }
  await page.screenshot({ path: 'screenshots/card-font-settings.png', fullPage: true });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('dialog', { name: 'Settings', exact: true }).waitFor({ state: 'hidden' });
  await title.click();
  assert((await page.locator('.idea-description').evaluate(el => getComputedStyle(el).fontFamily)).includes('Palatino'));
  await page.reload(); await title.waitFor();
  assert((await title.evaluate(el => getComputedStyle(el).fontFamily)).includes('Palatino'));
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  assert.equal(await font.inputValue(), 'classic');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(font).toBeVisible();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('Card font checks passed: five font choices, live card/title/description preview, saved preference, serif default, and mobile layout.');
} finally { await browser.close(); }
