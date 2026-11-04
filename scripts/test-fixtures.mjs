import { demoBoard } from '../src/lib/types.ts';
// Example data belongs only to isolated browser tests, never the app's first launch.
export async function seedExample(page) {
  await page.addInitScript(board => {
    if (localStorage.getItem('idea-garden-boards') === null) localStorage.setItem('idea-garden-boards', JSON.stringify([board]));
  }, demoBoard());
}
