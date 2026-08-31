import type { AdPlaybackOption } from '../types'

/**
 * Ad-compliance fixture payload — the JSON the demo surfaces in the JSON
 * panel during an ad break. The shape matches what the upstream
 * compliance pipeline emits; we treat it as opaque structured data.
 */
export type AdCompliancePayload = Record<string, unknown>

/**
 * Behaviour classification for an ad mode. Drives which playback /
 * overlay branch runs in `useDemoPlayback` without the hook needing
 * to spell out individual mode ids.
 *
 *   - `sync-ad-break`     — Sync / Sync: L-Bar / Sync: Impulse:
 *                           triggers a video ad break on the scrubber.
 *   - `pause-ad`          — Pause Ad: static creative shown on every
 *                           pause.
 *   - `pause-overlay`     — CTA Pause / Organic Pause: pause-triggered
 *                           product carousel + detail card. Driven by
 *                           the per-content `PAUSE_MOMENTS_REGISTRY`.
 *   - `companion`         — Carousel Shop / Companion: future modes
 *                           that render a sidecar UI rather than an
 *                           in-player overlay.
 */
export type AdModeKind = 'sync-ad-break' | 'pause-ad' | 'pause-overlay' | 'companion'

/**
 * Single source of truth for an ad mode's identity — code only, no
 * content-specific assets. As of 2026-06-15 evening this type is
 * **purely content-agnostic**: per-content creative URLs, compliance
 * payloads, and ad-break durations live on each content's
 * `ContentConfig.adAssets[mode]` map. `useDemoPlayback` reads from
 * there based on the active content + mode.
 *
 * Adding a new mode = creating a folder under `modes/<id>/` with a
 * `config.ts` (this shape, four fields total) and registering it.
 * Each consuming content then opts in by adding an `adAssets[<mode>]`
 * entry to its own `config.ts`. See `README.md` for the full cookbook.
 */
export type AdModeDefinition = {
  /** The dropdown value as users see it. Also the registry key. */
  id: AdPlaybackOption
  /** Display label in the Ad Playback dropdown. Usually equals `id`. */
  label: string
  /** When false, the mode is hidden from the dropdown. Stub modes that
   *  haven't been wired yet keep `enabled: false` until at least one
   *  content has `adAssets[<this mode>]` wired. */
  enabled: boolean
  /** Behaviour classification — see `AdModeKind` doc. */
  kind: AdModeKind
}

export type AdModeRegistry = Record<AdPlaybackOption, AdModeDefinition>
