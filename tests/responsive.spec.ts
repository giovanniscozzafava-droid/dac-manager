import { test, expect } from './helpers/fixtures';

test.describe('Responsive — drawer mobile + sidebar desktop', () => {
  test('su desktop la sidebar è visibile e non c\'è il bottone hamburger', async ({ authedPage: page }) => {
    if ((page.viewportSize()?.width ?? 0) < 1024) test.skip();
    await expect(page.getByRole('link', { name: /Agenda/i }).first()).toBeVisible();
    // Bottone "Apri menu" è visibile solo su mobile
    const hamburger = page.getByRole('button', { name: 'Apri menu' });
    await expect(hamburger).not.toBeVisible();
  });

  test('su mobile il drawer è chiuso di default e si apre con hamburger', async ({ authedPage: page }) => {
    if ((page.viewportSize()?.width ?? 9999) >= 1024) test.skip();
    // Drawer chiuso: il link Agenda non è visibile
    const agendaLink = page.getByRole('link', { name: /Agenda/i }).first();
    await expect(agendaLink).not.toBeVisible();

    // Apri drawer
    const hamburger = page.getByRole('button', { name: 'Apri menu' });
    await expect(hamburger).toBeVisible();
    await hamburger.click();

    // Drawer aperto: link visibile
    await expect(agendaLink).toBeVisible();
  });

  test('su mobile clic su un link sidebar naviga e chiude il drawer', async ({ authedPage: page }) => {
    if ((page.viewportSize()?.width ?? 9999) >= 1024) test.skip();
    await page.getByRole('button', { name: 'Apri menu' }).click();
    await page.getByRole('link', { name: /Pazienti/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Pazienti' })).toBeVisible({ timeout: 10_000 });
    // Drawer si chiude dopo navigazione
    const agendaLink = page.getByRole('link', { name: /Agenda/i }).first();
    await expect(agendaLink).not.toBeVisible({ timeout: 5_000 });
  });
});
