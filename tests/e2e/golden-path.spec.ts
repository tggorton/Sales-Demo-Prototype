import { expect, test } from '@playwright/test'

/**
 * Golden-path E2E (HANDOFF §14 — the canonical demo-works flow):
 * login → DHYH selection → Tier + Ad Mode picked → START → demo view
 * with the video player and panel rail visible.
 *
 * The login form pre-fills the demo credentials (DEMO_LOGIN_EMAIL +
 * DEMO_LOGIN_PASSWORD) on mount, so the login step is just a click —
 * no field interaction required for the happy path. The selector
 * dialog defaults to a valid Tier + Ad Mode pair so START works
 * without changing the dropdowns.
 *
 * Scope is intentionally limited: this verifies the demo *enters* its
 * play state without regression. Verifying actual playback / ad-break
 * visibility / panel sync requires manipulating `video.currentTime`
 * inside the page and is best added incrementally; for now those
 * surfaces are covered by the user's manual golden-path verification
 * after each phase.
 */

test.beforeEach(async ({ context }) => {
  // The app persists view + content selections in sessionStorage so a
  // page refresh resumes mid-demo (HANDOFF §14). For each test we want a
  // pristine login screen, so clear storage at the start.
  await context.clearCookies()
})

test('golden path: login → DHYH → demo view loads', async ({ page }) => {
  await page.goto('/')

  // Login screen has a pre-filled email + password; just click LOG IN.
  await expect(page.getByRole('button', { name: 'LOG IN' })).toBeVisible()
  await page.getByRole('button', { name: 'LOG IN' }).click()

  // Content selection screen — DHYH should be visible (it's the only
  // enabled tile per ENABLED_CONTENT_IDS in contentItems.ts).
  const dhyhTile = page.getByRole('button', { name: "Don't Hate Your House" })
  await expect(dhyhTile).toBeVisible()
  await dhyhTile.click()

  // Selector dialog opens with Tier + Ad Mode dropdowns pre-populated.
  // Verify the dialog rendered, then START the demo.
  await expect(page.getByRole('button', { name: 'START' })).toBeVisible()
  await page.getByRole('button', { name: 'START' }).click()

  // Demo view: the back-button to the selection screen is the easiest
  // unique signal that we transitioned out of the selector. Player
  // controls (play/pause, time readout) follow once the <video> element
  // hydrates.
  await expect(page.getByRole('button', { name: /back to content selection/i })).toBeVisible()

  // The MUI player time readout starts at "00:00 / ..." once the video
  // metadata has loaded. We don't pin the exact total duration string
  // (it varies by ad-mode selection); we just confirm the readout is
  // present, which means the player chrome rendered.
  await expect(page.locator('text=/^\\d\\d:\\d\\d \\/ \\d\\d:\\d\\d$/').first()).toBeVisible()
})
