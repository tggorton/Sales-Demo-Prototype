import type { AdPlaybackOption, TaxonomyOption, TierOption } from '../types'

/**
 * Canonical shape for a piece of content the demo can play.
 *
 * Every content tile lives at `src/demo/content/<id>/` and exports a
 * `ContentConfig` from its `config.ts`. The fields below capture what the
 * shell needs to know without hard-coding anything content-specific: tile
 * metadata, the video source, taxonomy hides, and which ad modes are valid
 * at each tier (so a future Tier-3-only mode is one config edit, not a
 * code change).
 */
export type ContentConfig = {
  /** Stable id (matches the directory name + the source resolver lookup). */
  readonly id: string
  /** Display title for the content selector + the title bar. */
  readonly title: string
  /** Total clip duration in seconds (post-splice for two-segment content). */
  readonly clipDurationSeconds: number
  /** Resolved video URL — usually env-overridable via `envString(...)`. */
  readonly videoUrl: string
  /** Per-content taxonomy hides (layered ON TOP OF the per-tier whitelist).
   *  Use sparingly — prefer fixing the upstream tier JSON when possible. */
  readonly hiddenTaxonomies: readonly TaxonomyOption[]
  /** Default list of ad modes available across every tier of this content.
   *  Globally-disabled modes (per the ad-mode registry) are still filtered
   *  out at the resolver layer. */
  readonly defaultAdModes: readonly AdPlaybackOption[]
  /** Per-tier overrides. Specify a tier here ONLY when its mode list
   *  diverges from `defaultAdModes` (e.g. a tier-exclusive mode). Tiers
   *  not listed here fall back to `defaultAdModes`. */
  readonly adModesByTier?: Partial<Record<TierOption, readonly AdPlaybackOption[]>>
}
