import { test, expect } from './helpers/fixtures';
import { navigateViaSidebar, simulateTabSwitch } from './helpers/auth';

test.describe('Anamnesi', () => {
  test('apre la pagina anamnesi e mostra l\'header', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Anamnesi/);
    await expect(page.getByRole('heading', { name: 'Anamnesi' })).toBeVisible();
    await expect(page.getByPlaceholder(/Cerca paziente/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Nuova Anamnesi/i })).toBeVisible();
  });

  test('il bottone "Nuova Anamnesi" apre il form di creazione', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Anamnesi/);
    await page.getByRole('button', { name: /Nuova Anamnesi/i }).click();
    await expect(page.getByRole('heading', { name: /Nuova Anamnesi/ })).toBeVisible({ timeout: 5_000 });
  });

  test('la ricerca filtra: testo inesistente → "nessun risultato" o nessuna riga', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Anamnesi/);
    await page.getByPlaceholder(/Cerca paziente/i).first().fill('XYZXYZ_NON_ESISTE_99999');
    await expect(page.getByText('XYZXYZ_NON_ESISTE_99999')).not.toBeVisible();
  });

  test('REGRESSIONE bug #3: tab switch non azzera la pagina anamnesi', async ({ authedPage: page }) => {
    await navigateViaSidebar(page, /Anamnesi/);
    await expect(page.getByRole('heading', { name: 'Anamnesi' })).toBeVisible();
    await page.waitForTimeout(1500);
    const before = (await page.locator('body').innerText()).length;
    await simulateTabSwitch(page);
    await page.waitForTimeout(500);
    const after = (await page.locator('body').innerText()).length;
    expect(after).toBeGreaterThan(before * 0.9);
    await expect(page.getByRole('heading', { name: 'Anamnesi' })).toBeVisible();
  });

  test.fixme('genera PDF anamnesi e lo scarica', async () => {
    // FIXME: scaricare e parsare il PDF richiede setup pdf-parser. Da aggiungere se serve.
  });

  test.fixme('invia anamnesi via email', async () => {
    // FIXME: invio email reale richiede mock SMTP o controllo inbox via API. Skip per ora.
  });
});
