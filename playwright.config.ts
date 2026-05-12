import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/_scouts/**', '**/auth.setup.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 2 retries per assorbire flake di rate-limit Supabase nel cross-browser.
  retries: process.env.CI ? 2 : 2,
  // 2 workers in locale: ogni test fa login via UI. Più workers = più chiamate auth = rate-limit.
  // Per il run cross-browser pesante, lancia con `--workers=1` (più lento ma più stabile).
  workers: process.env.CI ? 1 : 2,
  reporter: 'html',
  use: {
    baseURL: 'https://dac-manager.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] } },
  ],
});
