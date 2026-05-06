// Pure helper for the pause-overlay CTA / surface gating.
//
// A "pause window" is an inclusive `[start, end]` clip-time range during
// which the pause-to-shop affordance is active. Modes plug their own
// window list into this helper; the helper has no opinion on which
// windows belong to which mode.

export type PauseTimeWindow = { readonly start: number; readonly end: number }

/** Returns true if `clipSeconds` falls inside any of the supplied
 *  windows. Both endpoints are inclusive. Empty list → always false. */
export function isInPauseWindow(
  clipSeconds: number,
  windows: ReadonlyArray<PauseTimeWindow>
): boolean {
  for (const w of windows) {
    if (clipSeconds >= w.start && clipSeconds <= w.end) return true
  }
  return false
}
