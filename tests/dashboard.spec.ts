import { test, expect } from './helpers/fixtures';
import { simulateTabSwitch } from './helpers/auth';

test.describe('Dashboard', () => {
  test('mostra il saluto e le KPI principali', async ({ authedPage: page }) => {
    await expect(page.getByText(/Appuntamenti Oggi/i)).toBeVisible();
    await expect(page.getByText(/Fatturato Mese/i)).toBeVisible();
  });

  test('Fatturato Mese mostra un valore in euro', async ({ authedPage: page }) => {
    await expect(page.getByText(/Fatturato Mese/i)).toBeVisible({ timeout: 10_000 });
    // Aspetta che i KPI carichino il valore numerico (l'iniziale è "€0" mostrato dopo fetch)
    await expect(page.getByText(/€[\d.,]+/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('REGRESSIONE bug #3: tab switch non azzera la dashboard', async ({ authedPage: page }) => {
    const before = (await page.locator('body').innerText()).length;
    await simulateTabSwitch(page);
    await page.waitForTimeout(500);
    const after = (await page.locator('body').innerText()).length;
    expect(after).toBeGreaterThan(before * 0.9);
    await expect(
      page.getByRole('heading', { name: /Buongiorno|Buon pomeriggio|Buonasera/i })
    ).toBeVisible();
  });
});
