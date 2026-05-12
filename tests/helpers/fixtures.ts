import { test as base, expect, Page } from '@playwright/test';
import { loginViaUI } from './auth';

/**
 * Fixture custom: ogni test riceve una `page` già loggata e con dashboard caricata.
 * Per testare il login stesso (auth.spec.ts), usa `base` da @playwright/test direttamente.
 */
export const test = base.extend<{ authedPage: Page }>({
  authedPage: async ({ page }, use) => {
    await loginViaUI(page);
    await use(page);
  },
});

export { expect };
