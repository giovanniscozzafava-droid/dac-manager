import { test, expect } from './helpers/fixtures';
import { navigateViaSidebar, simulateTabSwitch } from './helpers/auth';

test.describe('Specialisti', () => {
  test('apre la pagina e mostra l\'header', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Specialisti/);
    await expect(page.getByRole('heading', { name: 'Specialisti' })).toBeVisible();
  });

  test('REGRESSIONE bug #3: tab switch non azzera specialisti', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Specialisti/);
    await expect(page.getByRole('heading', { name: 'Specialisti' })).toBeVisible();
    await page.waitForTimeout(1500);
    const before = (await page.locator('body').innerText()).length;
    await simulateTabSwitch(page);
    await page.waitForTimeout(500);
    const after = (await page.locator('body').innerText()).length;
    expect(after).toBeGreaterThan(before * 0.9);
  });
});
