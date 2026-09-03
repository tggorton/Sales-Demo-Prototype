import type { SyncImpulseSegment } from '../types'

// Phase 6b — pure-function ad-break / clip-time math.
//
// HANDOFF §6 (protected behavior): Sync-style ad-break content has two
// timelines:
//
//   - **player time** (`videoCurrentSeconds`): the scrubber's value.
//     For Sync-style ad-break modes this includes the ad-break duration
//     so the slider shows a colored ad block. Range:
//     `[0, clipDuration + adBreakDuration]`.
//   - **clip time** (`panelTimelineSeconds`): the displayed-clip value,
//     ignoring the ad break. Used to re-anchor scenes from the upstream
//     JSON onto the spliced clip. Range: `[0, clipDuration]`.
//
// `adBreakClipSeconds` (where the ad starts on the clip-time axis) is a
// per-content value — see `ContentConfig.adBreakClipSeconds`:
//   - DHYH: mid-clip splice point (Segment A → Ad → Segment B).
//   - MasterChef: equal to clip duration (tail-anchored: Content → Ad).
//
// The functions below convert between the two and resolve which Sync:
// Impulse segment is active. Extracting them as pure functions makes
// the §6 mapping unit-testable in isolation — historically this math
// has been the source of "panel sticks at the wrong scene during the
// ad break" and "products from Segment B leak into Segment A" bugs, so
// pinning the contract here is high-value.

/**
 * Convert a player-time second value to clip-time, treating the ad
 * break (when present) as an opaque hold. Inside the ad-break window
 * the clip-time is pinned just below the splice point so panels keyed
 * to clip-time stay anchored to the last pre-ad scene for the duration
 * of the break — without this pin, even a 0-length nudge into the
 * ad-break window would flip the panels to the first post-ad scene
 * (post-ad content starts at clip-time `adBreakClipSeconds`).
 *
 * For non-ad-break modes the two timelines are identical and this
 * function returns `playerSeconds` unchanged.
 */
export const mapPlayerToClipSeconds = (
  playerSeconds: number,
  options: {
    isAdBreakMode: boolean
    /** Clip-time the ad break starts at (= end of pre-ad content). */
    adBreakClipSeconds: number
    /** Per-mode ad-break duration (30s for Impulse/L-Bar, 45s for Sync). */
    adBreakDurationSeconds: number
  }
): number => {
  if (!options.isAdBreakMode) return playerSeconds
  if (playerSeconds < options.adBreakClipSeconds) return playerSeconds
  if (playerSeconds < options.adBreakClipSeconds + options.adBreakDurationSeconds) {
    // Inside the ad-break window: pin to just-below the splice point.
    // The 0.001s offset is intentional — clip-time === adBreakClipSeconds
    // selects the first post-ad scene, which is what we want to AVOID
    // until playback actually crosses past the ad. (For tail-anchored
    // content there are no post-ad scenes, so the pin simply holds the
    // panels on the last scene — same behaviour as the natural end.)
    return Math.max(0, options.adBreakClipSeconds - 0.001)
  }
  // Past the ad break: subtract the break duration to land in post-ad
  // content (DHYH Segment B). For tail-anchored content (MC) there is
  // no post-ad content; the value lands at clip-end and `hasPlaybackEnded`
  // takes over.
  return playerSeconds - options.adBreakDurationSeconds
}

/**
 * Resolve the scrubber position for one `timeupdate` tick on mid-clip,
 * clip-native sync content (Abbott). DHYH carries a source offset and the
 * tail-anchored titles end after their break, so both have their own paths;
 * this is the plain mid-clip splice.
 *
 * Branches on `previousPlayerSeconds` — our own timeline — rather than on the
 * element's time. That ordering is the whole point: the element's time lags a
 * seek by a frame or two, and branching on it let a stale value yank the
 * scrubber straight back out of a break the user had just jumped into.
 */
export const resolveMidClipSyncTick = (
  previousPlayerSeconds: number,
  elementSeconds: number,
  options: {
    adBreakClipSeconds: number
    adBreakDurationSeconds: number
    clipDurationSeconds: number
  }
): number => {
  const adStart = options.adBreakClipSeconds
  const adEnd = adStart + options.adBreakDurationSeconds
  const internalTotal = options.clipDurationSeconds + options.adBreakDurationSeconds
  // 1. Inside the break — the synthetic timer owns the timeline.
  if (previousPlayerSeconds >= adStart && previousPlayerSeconds < adEnd) {
    return previousPlayerSeconds
  }
  // 2. Past the break — element time plus the ad block. Clamped at `adEnd` so
  //    an element that has not been re-seeked yet cannot drag us pre-break.
  if (previousPlayerSeconds >= adEnd) {
    return Math.min(internalTotal, Math.max(adEnd, elementSeconds + options.adBreakDurationSeconds))
  }
  // 3. Content just reached the splice point — hand over to the ad.
  if (elementSeconds >= adStart - 0.05) return adStart
  // 4. Pre-break — 1:1.
  return elementSeconds
}

/**
 * Snap a *user-requested* seek that lands inside the ad break back to the
 * break's first frame.
 *
 * The ad's own `currentTime` is driven by the offset into the break
 * (`videoCurrentSeconds - adBreakClipSeconds`, see useDemoPlayback), so a
 * seek into the middle of the cyan block would otherwise start the creative
 * mid-roll and play only the remainder — measured: clicking 14.5s into a 30s
 * break started the ad at 16.0s. An ad should never begin mid-roll, while
 * scrubbing *to* the break should stay effortless, so any landing inside the
 * window resolves to `adBreakClipSeconds` and the creative plays in full.
 *
 * This mirrors the existing mid-break ad-mode-switch behaviour, which already
 * snaps the scrubber to the start of the block so a newly selected creative
 * stays aligned with the slider.
 *
 * Apply this ONLY to user seeks. The natural per-tick advance must pass
 * through untouched or the break could never progress past its own first
 * frame.
 */
export const snapSeekToAdBreakStart = (
  requestedPlayerSeconds: number,
  options: {
    isAdBreakMode: boolean
    adBreakClipSeconds: number
    adBreakDurationSeconds: number
  }
): number => {
  if (!options.isAdBreakMode) return requestedPlayerSeconds
  const adStart = options.adBreakClipSeconds
  const adEnd = adStart + options.adBreakDurationSeconds
  if (requestedPlayerSeconds >= adStart && requestedPlayerSeconds < adEnd) {
    return adStart
  }
  return requestedPlayerSeconds
}

/**
 * Build the Sync: Impulse scrubber timeline for sync-ad-break content.
 * Order is `[content, ad-break-1, content]` — for mid-clip splice content
 * (DHYH) the first content segment ends at the splice point and the
 * second fills the rest. For tail-anchored content (MasterChef)
 * `adBreakClipSeconds === clipDurationSeconds`, so the trailing content
 * segment collapses to zero length and the scrubber renders as
 * `[content, ad-break-1]`.
 */
export const buildDhyhImpulseSegments = (options: {
  adBreakClipSeconds: number
  adBreakDurationSeconds: number
  clipDurationSeconds: number
}): SyncImpulseSegment[] => {
  const adStart = options.adBreakClipSeconds
  const adEnd = adStart + options.adBreakDurationSeconds
  const total = options.clipDurationSeconds + options.adBreakDurationSeconds
  const segments: SyncImpulseSegment[] = [
    { start: 0, end: adStart, kind: 'content' },
    { start: adStart, end: adEnd, kind: 'ad-break-1' },
  ]
  // Only emit the trailing content segment when there's actual post-ad
  // content to fill it. Tail-anchored ads (MC) have `adEnd === total` so
  // this would be a zero-length segment.
  if (adEnd < total) {
    segments.push({ start: adEnd, end: total, kind: 'content' })
  }
  return segments
}

/**
 * Find the segment that contains `playerSeconds`. When the value is
 * past the last segment's end, returns the last segment (matches the
 * UI's "stick on the final beat after playback ends" behavior).
 * Returns `null` when there are no segments.
 */
export const findActiveImpulseSegment = (
  segments: readonly SyncImpulseSegment[],
  playerSeconds: number
): SyncImpulseSegment | null => {
  if (segments.length === 0) return null
  const exact = segments.find(
    (segment) => playerSeconds >= segment.start && playerSeconds < segment.end
  )
  return exact ?? segments[segments.length - 1]
}

/**
 * `true` when the active segment's `kind` is one of the ad-break kinds.
 * Pulled out as a tiny helper because three different consumers in the
 * hook ask the same question.
 */
export const isAdBreakSegment = (segment: SyncImpulseSegment | null): boolean =>
  segment?.kind === 'ad-break-1' || segment?.kind === 'ad-break-2'

/**
 * Progress through the active ad-break, in `[0, 1]`. Returns 0 when
 * not in an ad break (the JSON panel uses this to reveal the ad
 * decisioning payload linearly as the ad plays). Clamps to `[0, 1]`
 * defensively in case the player time briefly precedes or exceeds the
 * segment bounds during a scrub.
 */
export const computeAdBreakProgress = (
  segment: SyncImpulseSegment | null,
  playerSeconds: number,
  isAdBreakActive: boolean
): number => {
  if (!isAdBreakActive || !segment) return 0
  const duration = Math.max(1, segment.end - segment.start)
  const elapsed = playerSeconds - segment.start
  return Math.min(1, Math.max(0, elapsed / duration))
}
