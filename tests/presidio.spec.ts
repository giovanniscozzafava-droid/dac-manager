import { test, expect } from './helpers/fixtures';
import { navigateViaSidebar, simulateTabSwitch } from './helpers/auth';

test.describe('Presidio Infermeria', () => {
  test('apre la pagina e mostra l\'header', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Presidio Infermeria/);
    await expect(page.getByRole('heading', { name: /Presidio Infermeria/ })).toBeVisible();
    await expect(page.getByPlaceholder(/Cerca articolo, lotto/i)).toBeVisible();
  });

  test('il form mostra i campi per IVA scorporata (prezzo confezione IVAto + pezzi → prezzo unitario)', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Presidio Infermeria/);
    // Clicco il bottone Nuovo Articolo (o equivalente) per aprire il form
    const newBtn = page.getByRole('button', { name: /Nuovo|Aggiungi/i }).first();
    await newBtn.click();
    // Il form deve avere i 3 campi chiave dello scorporo
    const fields = await page.locator('input[type="number"]').count();
    expect(fields, 'almeno 3 campi numerici per scorporo IVA').toBeGreaterThanOrEqual(3);
  });

  test('REGRESSIONE bug #3: tab switch non azzera presidio', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Presidio Infermeria/);
    await expect(page.getByRole('heading', { name: /Presidio Infermeria/ })).toBeVisible();
    await page.waitForTimeout(1500);
    const before = (await page.locator('body').innerText()).length;
    await simulateTabSwitch(page);
    await page.waitForTimeout(500);
    const after = (await page.locator('body').innerText()).length;
    expect(after).toBeGreaterThan(before * 0.9);
  });
});
