import type { AdPlaybackOption } from '../types'

/**
 * Ad-compliance fixture payload — the JSON the demo surfaces in the JSON
 * panel during an ad break. The shape matches what the upstream
 * compliance pipeline emits; we treat it as opaque structured data.
 */
export type AdCompliancePayload = Record<string, unknown>

/**
 * Single source of truth for everything a particular ad mode needs at
 * runtime. One entry per mode in `AD_MODE_REGISTRY`.
 *
 * Adding a new mode = creating a folder under `modes/<id>/` with a
 * `config.ts` (this shape) and a `fixtures.json`, then registering it.
 * See `README.md` for the full cookbook.
 */
export type AdModeDefinition = {
  /** The dropdown value as users see it. Also the registry key. */
  id: AdPlaybackOption
  /** Display label in the Ad Playback dropdown. Usually equals `id`. */
  label: string
  /** When false, the mode is hidden from the dropdown. Stub modes that
   *  haven't been wired yet keep `enabled: false` until their config and
   *  creative assets are ready. */
  enabled: boolean

  // ---- Sync-style ad-break properties --------------------------------
  // These three are required for any mode that triggers a video ad break
  // on DHYH content (currently `Sync`, `Sync: L-Bar`, `Sync: Impulse`).
  // Disabled modes can leave them undefined; the runtime never reads
  // them when the mode isn't selected.

  /** DHYH ad-break wall-clock duration. Matches the actual mp4 length so
   *  the scrubber's cyan ad slot is the same length as the creative. */
  dhyhAdDurationSeconds?: number
  /** DHYH ad creative URL. Resolved through the `VITE_DHYH_*_AD_VIDEO_URL`
   *  env override at module load (see each mode's config). */
  dhyhAdVideoUrl?: string
  /** DHYH ad-compliance JSON shown in the JSON panel during the break. */
  dhyhCompliancePayload?: AdCompliancePayload
  /** Optional override for the JSON-panel ad-response label (the
   *  string rendered above the compliance payload, e.g.
   *  `"_AdBreak-1 Response"`). When unset, the default
   *  `'_AdBreak-{1|2} Response'` label is derived from the active
   *  impulse segment kind. Future ad formats whose response shape
   *  reads differently (e.g. `'_PauseAd Response'`,
   *  `'_CarouselShop Response'`) supply their own label here. */
  dhyhAdResponseLabel?: string
}

export type AdModeRegistry = Record<AdPlaybackOption, AdModeDefinition>
