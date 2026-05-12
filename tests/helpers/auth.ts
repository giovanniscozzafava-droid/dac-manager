import { Page, expect } from '@playwright/test';

/**
 * Esegue il login via UI (form email/password).
 * Usalo solo in test che ESPLICITAMENTE testano il login.
 * Per tutti gli altri test usa lo `storageState` salvato da auth.setup.ts.
 */
export async function loginViaUI(page: Page): Promise<void> {
  const email = process.env.DAC_TEST_EMAIL!;
  const password = process.env.DAC_TEST_PASSWORD!;
  if (!email || !password) throw new Error('DAC_TEST_EMAIL / DAC_TEST_PASSWORD non settate in .env');

  await page.goto('/');
  await page.getByRole('textbox', { name: 'nome@laboratoridac.it' }).fill(email);
  await page.getByRole('textbox', { name: '••••••••' }).fill(password);
  await page.getByRole('button', { name: 'Accedi' }).click();
  await expect(
    page.getByRole('heading', { name: /Buongiorno|Buon pomeriggio|Buonasera/i })
  ).toBeVisible({ timeout: 20_000 });
}

/**
 * Naviga a una pagina via sidebar (click sul link), non via `page.goto`.
 * Evita full reload e quindi il flash del LoginSplash.
 *
 * Su viewport mobile (< 1024px) la sidebar è in un drawer chiuso: apre prima l'hamburger.
 * Su desktop la sidebar è già visibile.
 */
export async function navigateViaSidebar(page: Page, linkName: string | RegExp): Promise<void> {
  // Se siamo su mobile, apri il drawer (bottone "Apri menu")
  const hamburger = page.getByRole('button', { name: 'Apri menu' });
  if (await hamburger.isVisible().catch(() => false)) {
    await hamburger.click();
  }
  await page.getByRole('link', { name: linkName }).first().click();
}

/** Mappa label sidebar → heading atteso sulla pagina di destinazione. */
export const SIDEBAR_LINKS = {
  Dashboard: { link: /^Dashboard$/, heading: /Buongiorno|Buon pomeriggio|Buonasera/i },
  Agenda: { link: /^Agenda$/, heading: 'Agenda' },
  Pazienti: { link: /^Pazienti$/, heading: 'Pazienti' },
  Task: { link: /^Task$/, heading: /Task/ },
  Anamnesi: { link: /^Anamnesi$/, heading: 'Anamnesi' },
  Pacchetti: { link: /^Pacchetti$/, heading: 'Pacchetti' },
  Specialisti: { link: /^Specialisti$/, heading: 'Specialisti' },
  Laboratorio: { link: /^Laboratorio$/, heading: /Inventario Laboratorio/ },
  Presidio: { link: /^Presidio Infermeria$/, heading: /Presidio/ },
  Parafarmacia: { link: /^Parafarmacia$/, heading: 'Parafarmacia' },
  Ricavi: { link: /^Ricavi$/, heading: 'Ricavi' },
  Costi: { link: /^Costi$/, heading: 'Costi' },
  Report: { link: /^Report$/, heading: 'Contabilità' },
  Configurazione: { link: /Configurazione/, heading: /Configurazione|Config/ },
} as const;

/** Simula il browser che va in background e torna in foreground (tab switch). */
export async function simulateTabSwitch(page: Page, hiddenForMs = 600): Promise<void> {
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('blur'));
  });
  await page.waitForTimeout(hiddenForMs);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
}
