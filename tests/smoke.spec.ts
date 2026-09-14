import { test, expect } from '@playwright/test';

/**
 * Smoke senza credenziali: verifica che la splash di login sia raggiungibile
 * e che il form base sia presente. Utile in CI / ambienti senza DAC_TEST_*.
 */
test.describe('Smoke (no auth)', () => {
  test('splash login mostra brand e form', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Palazzo della Salute/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole('textbox', { name: 'nome@laboratoridac.it' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: '••••••••' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accedi' })).toBeVisible();
  });

  test('Accedi resta disabilitato senza email/password', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Accedi' })).toBeDisabled();
    await page.getByRole('textbox', { name: 'nome@laboratoridac.it' }).fill('prova@example.com');
    await expect(page.getByRole('button', { name: 'Accedi' })).toBeDisabled();
    await page.getByRole('textbox', { name: '••••••••' }).fill('x');
    await expect(page.getByRole('button', { name: 'Accedi' })).toBeEnabled();
  });
});
