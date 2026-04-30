import { PANEL_AUTOSCROLL_MAX_VELOCITY_PX_PER_SEC } from '../constants'
import type { ProductEntry, SceneMetadata } from '../types'

// Phase 6a — pure-function panel-scroll engine helpers.
//
// The collapsed Taxonomy / Product / JSON panels each ride a 60fps RAF loop
// in `usePanelScrollEngine` (Phase 6e). This module owns the *math* the
// loop calls each frame: the discontinuity-vs-drift heuristic that decides
// whether to snap or smooth-scroll, and the per-panel target-position
// resolvers that convert (active scene/product, time) into a pixel offset.
//
// HANDOFF §9 (protected behavior): "Panel-scroll target-discontinuity
// heuristic — never add new explicit panel-snap flags; fix target
// computation and let the global heuristic snap." The previous code had a
// forest of special-case flags ("snap on tier change", "snap on taxonomy
// change", etc.) that all eventually got deleted. The replacement is a
// single rule: if the frame-over-frame target movement exceeds what
// natural playback drift could account for (`TARGET_JUMP_THRESHOLD_PX`),
// it's a state jump and we snap. Otherwise it's drift and we smooth-scroll
// at a velocity-capped exponential ease toward the target.

/** Pixel-padding above the active scene's card so the active row sits a
 *  few pixels below the panel header instead of flush against it. */
export const PANEL_TOP_PADDING_PX = 12

/** Exponential catch-up factor per frame for the smooth-scroll ease.
 *  Combined with the per-frame velocity cap, this gives a smooth settle
 *  at 60fps where small deltas close quickly and big deltas are paced. */
export const PANEL_SMOOTH_FACTOR = 0.14

/** Threshold below which we just write the final pixel value to clean up
 *  sub-pixel residue rather than spinning the easing function forever. */
export const PANEL_SNAP_THRESHOLD_PX = 0.25

/** Per-frame velocity cap derived from the user-facing px/sec setting.
 *  Assumes ~60fps; cheaper and simpler than measuring real frame delta. */
export const PANEL_MAX_PX_PER_FRAME =
  PANEL_AUTOSCROLL_MAX_VELOCITY_PX_PER_SEC / 60

/** Global "target-discontinuity" threshold (HANDOFF §9).
 *
 * Natural playback advances `panelTimelineSeconds` in small per-frame
 * increments, which the resolvers below translate into small per-frame
 * pixel-target deltas (normally well under `PANEL_MAX_PX_PER_FRAME`). Any
 * frame-over-frame target change that blows past this threshold is NOT
 * playback drift — it's a state jump (taxonomy switch, tier/content swap,
 * scene reindex, ad-break flip, panel re-open, window resize, scrub).
 * `decidePanelScrollAction` returns `'snap'` for those, `'smooth'` for
 * normal drift.
 *
 * The multiplier (8) is generous on purpose: normal playback produces
 * per-frame deltas of ~2–8px, so 8 * MAX_PX_PER_FRAME (~66px at default
 * settings) comfortably covers scene-boundary smoothing while still
 * catching every legitimate discontinuity.
 */
export const PANEL_TARGET_JUMP_THRESHOLD_PX = PANEL_MAX_PX_PER_FRAME * 8

/**
 * Per-panel scroll target. `unclamped` is the raw interpolated offset
 * (how far down the active scene actually sits from the top of the
 * rendered list); `clamped` is `unclamped` clamped to
 * `[0, scrollHeight − clientHeight]` and is what we actually write to
 * `scrollTop`.
 *
 * Why two values: after a backward scrub only a small subset of scenes
 * is mounted, so the panel is short and `maxScroll` is small. Each new
 * scene that mounts on autoplay grows `scrollHeight`, which suddenly
 * relaxes the clamp — the *clamped* target jumps in big steps even
 * though the *unclamped* one is moving smoothly. Using the clamped
 * value for jump detection misclassified that as a state discontinuity
 * and snapped on every new scene mount, which read as "auto-scroll
 * doesn't work". The discontinuity heuristic compares `unclamped`
 * frame-over-frame; only the apply step uses `clamped`.
 */
export type PanelScrollTarget = { clamped: number; unclamped: number }

/** Per-panel manual-scroll override state. `pauseUntil` is an epoch ms
 *  timestamp; while `Date.now()` is below it the engine leaves the
 *  panel's `scrollTop` alone. Once expired, `needsSnapOnResume` tells
 *  the next frame to jump straight to the live target in one frame.
 *  `lastTarget` is the previous-frame `unclamped` target — used by the
 *  discontinuity heuristic. `-1` is a sentinel meaning "no previous
 *  target yet, snap on the first write" (fresh mount or state reset). */
export type PanelManualScrollState = {
  pauseUntil: number
  needsSnapOnResume: boolean
  lastTarget: number
}

export const createPanelManualScrollState = (): PanelManualScrollState => ({
  pauseUntil: 0,
  needsSnapOnResume: false,
  lastTarget: -1,
})

/**
 * Build a `PanelScrollTarget` from a raw interpolated pixel offset and
 * the panel's max scroll, applying the floor at 0 and the clamp at
 * `maxScroll` while preserving the unclamped value for the heuristic.
 */
export const buildPanelScrollTarget = (
  raw: number,
  maxScroll: number
): PanelScrollTarget => {
  const safe = Math.max(0, raw)
  return { clamped: Math.min(maxScroll, safe), unclamped: safe }
}

export type PanelScrollDecision =
  /** User has the panel paused — leave scrollTop alone, just track lastTarget. */
  | { kind: 'paused' }
  /** Snap one frame: just-resumed-from-pause, sentinel state, or
   *  detected target-discontinuity. Writes `target.clamped` to scrollTop. */
  | { kind: 'snap' }
  /** Smooth-scroll one velocity-capped step toward the clamped target. */
  | { kind: 'smooth'; step: number }
  /** Sub-pixel residue — write the final target if not already there, otherwise no-op. */
  | { kind: 'settle' }

/**
 * Decide what the next frame should do for one panel — pure function
 * version of the apply-loop's branching. The actual `scrollTop` write
 * happens in the hook so this function stays testable without a DOM.
 *
 * The function does NOT mutate `manual` — the caller is responsible for
 * applying side effects (`manual.lastTarget = target.unclamped`,
 * `manual.needsSnapOnResume = false`, etc.) once it acts on the
 * decision. This keeps the decision logic isolated from the timing of
 * the writes, which makes it unit-testable.
 *
 * Order of precedence (matches the live hook):
 *   1. paused (`pauseUntil` in the future) → keep state, no scroll
 *   2. needsSnapOnResume → one-frame snap
 *   3. sentinel `lastTarget < 0` or |Δ| > threshold → snap (HANDOFF §9)
 *   4. |delta to scrollTop| < SNAP_THRESHOLD → settle (sub-pixel residue)
 *   5. otherwise → smooth ease, capped at MAX_PX_PER_FRAME
 */
export const decidePanelScrollAction = (
  target: PanelScrollTarget,
  manual: PanelManualScrollState,
  scrollTop: number,
  now: number
): PanelScrollDecision => {
  if (now < manual.pauseUntil) return { kind: 'paused' }
  if (manual.needsSnapOnResume) return { kind: 'snap' }

  const prevTarget = manual.lastTarget
  if (
    prevTarget < 0 ||
    Math.abs(target.unclamped - prevTarget) > PANEL_TARGET_JUMP_THRESHOLD_PX
  ) {
    return { kind: 'snap' }
  }

  const delta = target.clamped - scrollTop
  const absDelta = Math.abs(delta)
  if (absDelta < PANEL_SNAP_THRESHOLD_PX) return { kind: 'settle' }

  const eased = delta * PANEL_SMOOTH_FACTOR
  const step =
    eased > 0
      ? Math.min(eased, PANEL_MAX_PX_PER_FRAME)
      : Math.max(eased, -PANEL_MAX_PX_PER_FRAME)
  return { kind: 'smooth', step }
}

/**
 * Walk backward through a refs array to find the most recent populated
 * ref at or before `upToIdx`. Taxonomy and JSON panels skip scenes that
 * don't emit data for the current selection (e.g. scenes without
 * `music_emotion`), so the refs array is sparse. Without this walk-back,
 * interpolation would fall back to offset 0 (the top of the container),
 * causing the scroll to snap to the top every time a scene with no data
 * became active — a big source of the old "stall then aggressively catch
 * up" behavior.
 */
export const walkBackForRef = (
  refs: Array<HTMLDivElement | null>,
  upToIdx: number
): HTMLDivElement | null => {
  for (let i = upToIdx; i >= 0; i--) {
    const node = refs[i]
    if (node) return node
  }
  return null
}

/**
 * Target position for scene-based panels (Taxonomy, JSON). Interpolates
 * from the nearest rendered scene BEFORE the active one to the active
 * scene's own card, using the active scene's duration as the time
 * window. If the active scene has no rendered ref (no data for the
 * current selection) we stay parked on the previous rendered ref until
 * the timeline reaches a new one.
 *
 * Returns `null` when there's nothing to scroll to (no scenes, no
 * active index, missing container).
 */
export const resolveSceneScrollTarget = (
  container: HTMLDivElement | null,
  refs: Array<HTMLDivElement | null>,
  scenes: SceneMetadata[],
  activeIdx: number,
  time: number
): PanelScrollTarget | null => {
  if (!container || scenes.length === 0 || activeIdx < 0) return null
  const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)

  const currentRef = refs[activeIdx] ?? null
  if (!currentRef) {
    const fallback = walkBackForRef(refs, activeIdx - 1)
    if (!fallback) return { clamped: 0, unclamped: 0 }
    return buildPanelScrollTarget(fallback.offsetTop - PANEL_TOP_PADDING_PX, maxScroll)
  }

  const prevRef = walkBackForRef(refs, activeIdx - 1)
  const activeScene = scenes[activeIdx]
  const sceneDuration = Math.max(0.001, activeScene.end - activeScene.start)
  const progress = Math.min(
    1,
    Math.max(0, (time - activeScene.start) / sceneDuration)
  )
  const startOffset = prevRef ? prevRef.offsetTop : 0
  const endOffset = currentRef.offsetTop
  const interpolated = startOffset + (endOffset - startOffset) * progress
  return buildPanelScrollTarget(interpolated - PANEL_TOP_PADDING_PX, maxScroll)
}

/**
 * Target position for the Product panel. Products are always all
 * rendered (no null gaps, unlike scene-keyed taxonomy/JSON panels), so
 * we can use a tighter interpolation driven by adjacent products'
 * `sceneStart` times. When two consecutive products share a scene
 * start, falls back to `fallbackSceneProgress` (the active scene's own
 * progress fraction) so the interpolation still moves smoothly.
 */
export const resolveProductScrollTarget = (
  container: HTMLDivElement | null,
  productRefs: Array<HTMLDivElement | null>,
  products: ProductEntry[],
  activeIdx: number,
  time: number,
  fallbackSceneProgress: number
): PanelScrollTarget | null => {
  if (!container || products.length === 0 || activeIdx < 0) return null
  const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
  const currentRef = productRefs[activeIdx]
  if (!currentRef) return null
  const prevIdx = activeIdx - 1
  const prevRef = prevIdx >= 0 ? productRefs[prevIdx] : null
  const currentProduct = products[activeIdx]
  const prevProduct = prevIdx >= 0 ? products[prevIdx] : null

  let progress = fallbackSceneProgress
  if (prevProduct && currentProduct.sceneStart > prevProduct.sceneStart) {
    progress =
      (time - prevProduct.sceneStart) /
      (currentProduct.sceneStart - prevProduct.sceneStart)
  }
  progress = Math.min(1, Math.max(0, progress))
  const startOffset = prevRef ? prevRef.offsetTop : 0
  const endOffset = currentRef.offsetTop
  const interpolated = startOffset + (endOffset - startOffset) * progress
  return buildPanelScrollTarget(interpolated - PANEL_TOP_PADDING_PX, maxScroll)
}
