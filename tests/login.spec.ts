import { test, expect } from '@playwright/test';

const EMAIL = process.env.DAC_TEST_EMAIL!;
const PASSWORD = process.env.DAC_TEST_PASSWORD!;

test('login funziona e porta dentro al gestionale', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('textbox', { name: 'nome@laboratoridac.it' }).fill(EMAIL);
  await page.getByRole('textbox', { name: '••••••••' }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Accedi' }).click();

  // Il form di login sparisce
  await expect(page.getByRole('button', { name: 'Accedi' })).not.toBeVisible({ timeout: 15000 });

  // Siamo dentro: il saluto nel heading principale (universale desktop + mobile)
  await expect(
    page.getByRole('heading', { name: /Buongiorno|Buon pomeriggio|Buonasera/i })
  ).toBeVisible({ timeout: 15000 });

  // E vedo le KPI della dashboard (presenti su tutti i viewport)
  await expect(page.getByText(/Appuntamenti Oggi/i)).toBeVisible();
  await expect(page.getByText(/Fatturato Mese/i)).toBeVisible();
});
