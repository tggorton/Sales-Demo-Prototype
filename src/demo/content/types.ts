import type { AdPlaybackOption, TaxonomyOption, TierOption } from '../types'

/**
 * Per-mode creative + compliance assets for a single content tile.
 * Different mode `kind`s use different fields here — `'sync-ad-break'`
 * modes use `videoUrl` + `durationSeconds`, `'pause-ad'` uses
 * `imageUrl`. Both can ship a `compliancePayload` shown in the JSON
 * panel and a `responseLabel` override for the panel header.
 */
export type ContentAdAssets = {
  /** Sync-style modes: video creative URL (typically MP4). */
  readonly videoUrl?: string
  /** Sync-style modes: ad-break wall-clock duration in seconds. Should
   *  match `videoUrl`'s actual length so the scrubber's coloured ad
   *  segment lines up with the creative. */
  readonly durationSeconds?: number
  /** Pause Ad: static image creative URL. */
  readonly imageUrl?: string
  /** Compliance JSON shown in the JSON panel while the mode is active. */
  readonly compliancePayload?: Record<string, unknown>
  /** JSON-panel label override (e.g. `'_PauseAd Response'`). */
  readonly responseLabel?: string
}

/**
 * Canonical shape for a piece of content the demo can play.
 *
 * Every content tile lives at `src/demo/content/<id>/` and exports a
 * `ContentConfig` from its `config.ts`. The fields below capture what the
 * shell needs to know without hard-coding anything content-specific: tile
 * metadata, the video source, taxonomy hides, which ad modes are valid
 * at each tier, AND the per-mode creative + compliance assets.
 *
 * Per 2026-06-15 isolation refactor: `adAssets` is the SINGLE SOURCE OF
 * TRUTH for per-content ad data. Ad-mode configs are pure metadata
 * (`id` / `label` / `enabled` / `kind`) — they no longer carry creative
 * URLs or compliance JSON. Adding/removing a content tile means touching
 * only that content's `config.ts` + the registries in
 * `src/demo/content/index.ts`. No content is wired to read another
 * content's assets.
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
  /** Clip-time second where the sync-style ad break begins. For mid-clip
   *  splice content (DHYH), this is the splice point between Segment A
   *  and Segment B. For tail-anchored content (MasterChef), this equals
   *  `clipDurationSeconds` — the ad break starts the moment the content
   *  finishes. Consumed by the ad-break scrubber + player-to-clip-time
   *  mapping in `useDemoPlayback`. */
  readonly adBreakClipSeconds: number
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
  /** Per-mode creative + compliance assets. Modes listed in `defaultAdModes`
   *  / `adModesByTier` should have an entry here; modes missing from this
   *  map have no playback assets wired (the runtime gracefully falls
   *  through to the placeholder code path). */
  readonly adAssets?: Partial<Record<AdPlaybackOption, ContentAdAssets>>
}
