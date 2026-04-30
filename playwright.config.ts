import { defineConfig, devices } from '@playwright/test'

/**
 * Phase 7b — Playwright golden-path E2E setup.
 *
 * One project (chromium) is plenty for the demo's needs; we're verifying
 * the user-visible flow runs end-to-end without regressing, not chasing
 * cross-browser parity. The `webServer` block boots the Vite dev server
 * automatically so `npm run test:e2e` is a single command — no separate
 * "start the server first" step.
 *
 * Tests live under `tests/e2e/`. The Vitest unit tests live in
 * `tests/unit/` and use a separate runner (`npm run test:run`); their
 * paths don't overlap so the two test nets don't trip over each other.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  // Match Playwright's default expectations rather than Vitest's.
  fullyParallel: true,
  // Fail the CI build if `test.only` is left in source.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:5173',
    // Capture a trace on first retry — useful in CI when the test
    // failed once and we want to debug without re-running locally.
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Boot Vite dev server before tests run; reuse an already-running
  // server in local dev so `npm run dev` + `npm run test:e2e` is a
  // valid workflow.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
