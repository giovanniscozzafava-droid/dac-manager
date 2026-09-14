import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers/auth';

const EMAIL = process.env.DAC_TEST_EMAIL!;

test.describe('Auth', () => {
  test('login con credenziali corrette entra nel gestionale', async ({ page }) => {
    await loginViaUI(page);
    await expect(page.getByText(/Appuntamenti Oggi/i)).toBeVisible();
  });

  test('login con password sbagliata mostra errore', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: 'nome@laboratoridac.it' }).fill(EMAIL);
    await page.getByRole('textbox', { name: '••••••••' }).fill('password-sbagliata-12345');
    await page.getByRole('button', { name: 'Accedi' }).click();
    // Resta sul form di login (non si vede l'heading di benvenuto) E compare un messaggio di errore
    await expect(page.getByRole('button', { name: 'Accedi' })).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText(/Email o password errat|Invalid|errato/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test('sessione persistente: dopo reload resto loggato', async ({ page }) => {
    // Bug C: era bloccato su "Caricamento..." al F5 — fix in useAuth (watchdog + onAuthStateChange).
    await loginViaUI(page);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: /Buongiorno|Buon pomeriggio|Buonasera/i })
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('button', { name: 'Accedi' })).not.toBeVisible();
  });

  test('logout riporta al form di login', async ({ page }) => {
    await loginViaUI(page);
    // Su mobile la sidebar è in drawer: apri prima l'hamburger
    const hamburger = page.getByRole('button', { name: 'Apri menu' });
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click();
    }
    // Trigger del menu utente: ci sono 2 sidebar nel DOM (desktop hidden + drawer mobile),
    // quindi filtro per `:visible` per prendere quella effettivamente attiva.
    const userTrigger = page.locator('button:visible').filter({ hasText: /Giovanni Scozzafava|Direzione/ }).first();
    await userTrigger.scrollIntoViewIfNeeded();
    await userTrigger.click();
    await page.locator('button:visible').filter({ hasText: 'Esci' }).first().click();
    await expect(page.getByRole('button', { name: 'Accedi' })).toBeVisible({ timeout: 10_000 });
  });

  test.fixme('reset password invia email', async () => {
    // FIXME: il flow reset password richiede email reale + click su link inviato.
    // Non testabile in E2E senza mock SMTP o accesso casella IMAP del tester.
  });
});
