// Abbott Elementary content-specific constants. Parallel to
// `src/demo/content/dhyh/timeline.ts`; everything content-shaped that the
// shell needs lives here.
import { envString } from '../../utils/env'

/** Stable id used by source resolvers + per-content config lookups. */
export const ABBOT_CONTENT_ID = 'abbot'

/** Bundled clip. Override via `VITE_ABBOT_VIDEO_URL` if hosting elsewhere. */
export const ABBOT_VIDEO_URL = envString(
  'VITE_ABBOT_VIDEO_URL',
  '/assets/video/abbot.mp4'
)

// Duration is sourced from the tier JSON (`duration_in_seconds`) — keep this
// in sync with the JSON value.
export const ABBOT_CLIP_DURATION_SECONDS = 601.042

// ---------- Tier-JSON time base ----------------------------------------------
// 'clip'   — tier JSON `startTime`/`endTime` are already on the trimmed-clip
//            timeline (clip-native delivery).
// 'source' — tier JSON values are on the original full-source timeline and get
//            remapped through the splice constants below.
export const ABBOT_TIER_TIME_BASE: 'clip' | 'source' = 'clip'

// ---------- Ad break (clip-time seconds) ------------------------------------
// Pins WHERE in the clip the Sync / Sync: L-Bar / Sync: Impulse ad break
// starts. End-of-clip = `clipDurationSeconds`; mid-clip splice = the cut
// point on the clip timeline.
//
// All ad modes start disabled in `config.ts` until creatives are produced;
// this constant is in place so wiring ads on is a one-line config change.
// 4:57.52 — 3 seconds off the clip's exact midpoint (5:00.52) and inside a
// 42-second silent run (4:31–5:13), so no dialogue is cut. It is a real scene
// boundary with a Living Room → Kitchen transition preceded by a 5.5s hold, and
// it splits the clip almost evenly by products too (290 / 245 SKUs) where the
// previous 1:24 position was lopsided (130 / 373).
//
// Moved from 84.01 (the end of the fast-cut cold open) on 2026-08-31: the demo
// is scrubbed by a seller rather than watched through, so an early break bought
// nothing, while a mid-point break reads as a believable commercial position.
export const ABBOT_AD_BREAK_CLIP_SECONDS = 297.52

// Legacy aliases the scene builder consumes — kept for parity with DHYH's
// surface even when the time base is 'clip'.
export const ABBOT_CLIP_START_SECONDS = 0
export const ABBOT_CLIP_END_SECONDS = ABBOT_CLIP_DURATION_SECONDS

// ---------- Pause-mode timing ------------------------------------------------
// Organic Pause: the CTA hint shows only during the first N seconds of
// playback; the pause overlay itself surfaces on any pause thereafter.
export const ABBOT_ORGANIC_PAUSE_CTA_END_SECONDS = 15

export type AbbotPauseWindow = { readonly start: number; readonly end: number }

// CTA Pause windows are read FROM `./ads/cta-pause.json` so the JSON stays the
// single source of truth — partners see the same values in the data and in
// code. To change them, re-run:
//   node scripts/generate-cta-pause-moments.mjs --content abbot --windows a-b,c-d
// CTA Pause deliberately does NOT track the ad break — nobody builds a creative
// for it and it isn't gated on a break. What it wants is two clearly separated
// stretches a seller can scrub into:
//   84–174   the original cold-open position (kept)
//   298–448  from the new mid-clip break through the densest product run
// 240s of 601s in two sections — enough to land on when scrubbing, while still
// meaningfully "windowed" versus Organic Pause, which responds to ANY pause.
import {
  readCtaPauseWindows,
  type PauseMomentsDocument,
} from '../_shared/pauseMoments'
import ctaPauseJson from './ads/cta-pause.json'

export const ABBOT_CTA_PAUSE_WINDOWS: ReadonlyArray<AbbotPauseWindow> =
  readCtaPauseWindows(ctaPauseJson as unknown as PauseMomentsDocument)
