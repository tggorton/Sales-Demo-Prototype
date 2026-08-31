// MasterChef Australia content-specific constants. Parallel to
// `src/demo/content/dhyh/timeline.ts`; everything content-shaped that the
// shell needs lives here.
import { envString } from '../../utils/env'

/** Stable id used by source resolvers + per-content config lookups. */
export const MASTERCHEF_CONTENT_ID = 'masterchef'

/** Bundled clip — a 4:01 trim from a MasterChef Australia S18 episode.
 *  Override via `VITE_MASTERCHEF_VIDEO_URL` if hosting elsewhere. */
export const MASTERCHEF_VIDEO_URL = envString(
  'VITE_MASTERCHEF_VIDEO_URL',
  '/assets/video/masterchef.mp4'
)

// Clip is a native trim — no source-time → clip-time remap needed (unlike
// DHYH's two-segment splice). The tier JSONs ship with `startTime`/`endTime`
// already on the trimmed-clip timeline.
//
// Duration is sourced from the tier JSON (`duration_in_seconds`) — keep this
// in sync with the JSON value. 241.42 ≈ 4:01.
export const MASTERCHEF_CLIP_DURATION_SECONDS = 241.42

// ---------- Tier-JSON time base ----------------------------------------------
// MasterChef is delivered clip-native — no source-splice path. Keeping the
// constant in the same shape DHYH uses so a future re-cut that introduces a
// splice can swap to 'source' without restructuring this file.
export const MASTERCHEF_TIER_TIME_BASE: 'clip' | 'source' = 'clip'

// ---------- Ad break (clip-time seconds) ------------------------------------
// Per design direction (2026-06-15): for MasterChef, the Sync / Sync: L-Bar /
// Sync: Impulse ad break runs at the END of the clip rather than at a mid-clip
// splice point. The exact wall-clock duration of each ad creative is owned by
// the ad-mode registry (`dhyhAdDurationSeconds` per mode); this constant just
// pins WHERE in the clip the break starts. Equal to clip duration → break
// "starts" the moment the content ends, which the scrubber renders as a tail
// segment.
//
// All ad modes are DISABLED for MasterChef in `config.ts` until the ad creatives
// + compliance JSONs are produced; this constant is wired up in advance so the
// switch-on later is a one-line config change.
export const MASTERCHEF_AD_BREAK_CLIP_SECONDS = MASTERCHEF_CLIP_DURATION_SECONDS

// Legacy aliases the scene builder consumes — kept for parity with DHYH's
// surface even though MC's clip-native data path doesn't use them.
export const MASTERCHEF_CLIP_START_SECONDS = 0
export const MASTERCHEF_CLIP_END_SECONDS = MASTERCHEF_CLIP_DURATION_SECONDS

// ---------- Pause-overlay CTA windows (clip-time seconds) ----------------
//
// Sourced FROM `./ads/cta-pause.json` (top-level `cta_pause_windows`
// field) so partners see the same values in the JSON and in code — the
// JSON is the single source of truth. To CHANGE the windows: re-run
// `scripts/generate-cta-pause-moments.mjs --content masterchef --windows ...`
// and this constant updates on the next rebuild.
//
// CTA Pause overlay surfaces ONLY when the user pauses inside one of
// these windows. Outside the windows the pause behaves normally (no
// carousel). The Organic Pause CTA is a separate, time-bounded hint
// that decays after the first few seconds of playback.
export const MASTERCHEF_ORGANIC_PAUSE_CTA_END_SECONDS = 15

export type MasterchefPauseWindow = { readonly start: number; readonly end: number }

import {
  readCtaPauseWindows,
  type PauseMomentsDocument,
} from '../_shared/pauseMoments'
import ctaPauseJson from './ads/cta-pause.json'

export const MASTERCHEF_CTA_PAUSE_WINDOWS: ReadonlyArray<MasterchefPauseWindow> =
  readCtaPauseWindows(ctaPauseJson as unknown as PauseMomentsDocument)
