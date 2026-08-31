// Big Brother Australia content-specific constants. Parallel to
// `src/demo/content/dhyh/timeline.ts`; everything content-shaped that the
// shell needs lives here.
import { envString } from '../../utils/env'

/** Stable id used by source resolvers + per-content config lookups. */
export const BB_CONTENT_ID = 'bb'

/** Bundled clip. Override via `VITE_BB_VIDEO_URL` if hosting elsewhere. */
export const BB_VIDEO_URL = envString(
  'VITE_BB_VIDEO_URL',
  '/assets/video/bb.mp4'
)

// Duration is sourced from the tier JSON (`duration_in_seconds`) — keep this
// in sync with the JSON value.
export const BB_CLIP_DURATION_SECONDS = 271.052

// ---------- Tier-JSON time base ----------------------------------------------
// 'clip'   — tier JSON `startTime`/`endTime` are already on the trimmed-clip
//            timeline (clip-native delivery).
// 'source' — tier JSON values are on the original full-source timeline and get
//            remapped through the splice constants below.
export const BB_TIER_TIME_BASE: 'clip' | 'source' = 'clip'

// ---------- Ad break (clip-time seconds) ------------------------------------
// Pins WHERE in the clip the Sync / Sync: L-Bar / Sync: Impulse ad break
// starts. End-of-clip = `clipDurationSeconds`; mid-clip splice = the cut
// point on the clip timeline.
//
// All ad modes start disabled in `config.ts` until creatives are produced;
// this constant is in place so wiring ads on is a one-line config change.
export const BB_AD_BREAK_CLIP_SECONDS = 271.052

// Legacy aliases the scene builder consumes — kept for parity with DHYH's
// surface even when the time base is 'clip'.
export const BB_CLIP_START_SECONDS = 0
export const BB_CLIP_END_SECONDS = BB_CLIP_DURATION_SECONDS

// ---------- Pause-overlay CTA windows (clip-time seconds) ----------------
//
// Sourced FROM `./ads/cta-pause.json` (top-level `cta_pause_windows`
// field) so partners see the same values in the JSON and in code — the
// JSON is the single source of truth. To CHANGE the windows: re-run
// `scripts/generate-cta-pause-moments.mjs --content bb --windows ...`
// and this constant updates on the next rebuild.
//
// CTA Pause overlay surfaces ONLY when the user pauses inside one of
// these windows. Outside the windows the pause behaves normally (no
// carousel). Organic Pause has NO window gating — any pause surfaces
// the carousel.
export const BB_ORGANIC_PAUSE_CTA_END_SECONDS = 15

export type BbPauseWindow = { readonly start: number; readonly end: number }

import {
  readCtaPauseWindows,
  type PauseMomentsDocument,
} from '../_shared/pauseMoments'
import ctaPauseJson from './ads/cta-pause.json'

export const BB_CTA_PAUSE_WINDOWS: ReadonlyArray<BbPauseWindow> =
  readCtaPauseWindows(ctaPauseJson as unknown as PauseMomentsDocument)
