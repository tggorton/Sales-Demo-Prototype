// DHYH-specific timeline + clip-window constants. Moved out of
// `src/demo/constants.ts` in Phase 5a so that everything DHYH owns lives
// under `src/demo/content/dhyh/`. Generic / shared constants
// (TAXONOMY_DEDUPE_WINDOW_SECONDS, panel-scroll tuning, login credentials,
// etc.) stay in `constants.ts` because they apply to every content tile.
import { envNumber, envString } from '../../utils/env'

/** Stable id used by source resolvers to look up bundled tier JSON,
 *  product images, and the per-content config. */
export const DHYH_CONTENT_ID = 'dhyh'

export const DHYH_VIDEO_URL = envString('VITE_DHYH_VIDEO_URL', '/assets/video/dhyh-cmp.mp4')

// Companion / QR destination shared across all DHYH sync ad modes. Per-mode
// creative URLs + durations live in src/demo/ad-modes/modes/<id>/config.ts.
export const DHYH_IMPULSE_AD_COMPANION_URL = 'https://kerv.social/embed/3/32014'

// DHYH clip window – two-segment splice.
// -------------------------------------------------------------------------------------
// The shipped `dhyh-cmp.mp4` is a pre-spliced concatenation of two ranges from the
// original 44-minute episode, chosen to surface the most product-rich moments:
//   Segment A (pre-ad):  source 19:45 – 21:32  →  clip 0:00 – 1:47
//   Segment B (post-ad): source 35:45 – 44:00  →  clip 1:47 – 10:02
// Because the file itself is a splice, `video.currentTime` maps 1:1 onto clip time –
// the player never has to think about the original source timeline. The only place
// that cares about source-time is `scenes.ts` (this directory), which re-anchors
// each scene from the upstream JSON (indexed against the full video) into the
// spliced clip timeline using the constants below.
export const DHYH_SEGMENT_A_SOURCE_START = 19 * 60 + 45 // 19:45 in the 44-min source
export const DHYH_SEGMENT_A_SOURCE_END = 21 * 60 + 32 // 21:32 in the source
export const DHYH_SEGMENT_A_DURATION =
  DHYH_SEGMENT_A_SOURCE_END - DHYH_SEGMENT_A_SOURCE_START // 107s (1:47)
export const DHYH_SEGMENT_B_SOURCE_START = 35 * 60 + 45 // 35:45 in the source
export const DHYH_SEGMENT_B_SOURCE_END = 44 * 60 + 0 // 44:00 in the source
export const DHYH_SEGMENT_B_DURATION =
  DHYH_SEGMENT_B_SOURCE_END - DHYH_SEGMENT_B_SOURCE_START // 495s (8:15)
export const DHYH_CLIP_DURATION_SECONDS =
  DHYH_SEGMENT_A_DURATION + DHYH_SEGMENT_B_DURATION // 602s (10:02) – displayed duration
// The ad break sits exactly at the splice point so the playback-order is
// Segment A → Ad → Segment B.
export const DHYH_AD_BREAK_CLIP_SECONDS = DHYH_SEGMENT_A_DURATION

// ---------- DHYH curated location timeline -----------------------------------
//
// The upstream model only emits scene-level `locations` on a small handful of
// scenes, and the rest of the show goes blank. Earlier attempts to fill the
// gaps – forward-filling adjacent scenes, or stamping the show-wide #1
// location across every scene – produced obviously-wrong results (e.g.
// "Cottage" for 74s of Segment A, or "Bathroom" 95% of the demo when the
// first 2:30 are clearly construction b-roll, not bathroom content).
//
// Instead we anchor a deliberate clip-time → location timeline, derived from
// what is actually visible/audible in the clip (objects, transcripts, IAB
// tags). The label that's "active" at any given clip-time is the entry whose
// `fromSec` is the largest one ≤ the current clip-time. Per-scene location
// tags from the JSON still win the headline when they exist at high
// confidence (≥ 0.85), so honest signal from the model is never overridden.
// The Considered list continues to come from `video_metadata.locations`.
//
// Adjust this list when the splice ranges change or when you want a different
// editorial story for the demo. Each entry's `confidence` is what surfaces in
// the UI chip and is sourced from the show-wide `video_metadata.locations`
// numbers in the JSON when possible.
export type DhyhLocationTimelineEntry = {
  fromSec: number
  location: string
  confidence: number
}

// Each band's `confidence` is sourced from the show-wide
// `video_metadata.locations` numbers in the JSON (Bathroom 0.95, Kitchen 0.95,
// Bedroom 0.85, Living Room 0.80, Construction Site 0.90). Boundaries are
// chosen by reading per-scene `objects` arrays in the upstream JSON: refrigerator
// + oven + dishwasher = kitchen, sink + toilet = bathroom, bed = bedroom,
// dining/coffee tables + pillows + mirrors = living room, etc.
export const DHYH_LOCATION_TIMELINE: DhyhLocationTimelineEntry[] = [
  { fromSec: 0, location: 'Construction Site', confidence: 0.9 },
  // 2:33 – the "Oh my god! Nice!" reveal moment; open-plan entry shows
  // dining table, coffee table, mirror, pillow.
  { fromSec: 153, location: 'Living Room', confidence: 0.85 },
  // 3:35 – kitchen tour begins: refrigerator + paper-towel rack at 3:36, then
  // oven (4:07, 4:18), dishwasher + refrigerator (4:40), sink (5:26). The shots
  // between those object hits (4:42–5:24) are people-in-kitchen interview
  // frames with no detectable furniture; they belong to the same kitchen
  // section, so we keep this band continuous all the way to the bathroom cut.
  { fromSec: 215, location: 'Kitchen', confidence: 0.95 },
  // 5:30 – bathroom #1: sink + toilet directly visible.
  { fromSec: 330, location: 'Bathroom', confidence: 0.95 },
  // 6:13 – bedroom: bed object detected in scene 731.
  { fromSec: 373, location: 'Bedroom', confidence: 0.85 },
  // 6:45 – hallway / transition between rooms (vase only).
  { fromSec: 405, location: 'Living Room', confidence: 0.8 },
  // 7:07 – bathroom #2: bathtub + toilet + sink + mirror — definitively bathroom.
  { fromSec: 427, location: 'Bathroom', confidence: 0.95 },
  // 7:30 – master bedroom / sitting area: books, lamp, dress, chair, painting.
  // Note: the model vocabulary does not include "Office" or "Study"; "Bedroom"
  // is the closest fit for this stretch and matches the dress + bed-adjacent
  // objects detected in the upstream JSON.
  { fromSec: 450, location: 'Bedroom', confidence: 0.85 },
  // 9:25 – final kitchen tour: dishwasher + refrigerator.
  { fromSec: 565, location: 'Kitchen', confidence: 0.95 },
]

// Minimum confidence for a scene-level location to override the curated
// timeline. Below this, the timeline wins (e.g. scene 356's "Cottage" at
// 0.76 is treated as noise instead of being inserted into the headline).
export const DHYH_SCENE_LOCATION_OVERRIDE_CONFIDENCE = 0.85

// Minimum source-time overlap (seconds) required for a scene to be admitted
// into the spliced clip. Scenes from the upstream JSON are 1–3s long, so a
// scene whose overlap with our [SEG_A]/[SEG_B] window is only a few tens of
// milliseconds is almost certainly a boundary-leak: the cut chops it in half
// and what bleeds in is metadata from the *other* (excluded) side of the cut,
// not what's actually visible in our clip. Concretely: scene 335 in the
// source spans 1182.56–1185.06 and is tagged `location: Park`; with Segment
// A starting at 1185.00, only 0.06s of it touches our clip, but the
// taxonomy gap-filler then forward-fills "Park" across the next ~74s of
// scenes that have no location of their own – making "Park" the dominant
// Location for most of the pre-ad clip even though nothing park-like is on
// screen. Requiring at least ~half a second of real overlap drops these
// sliver-leaks while still keeping any scene that genuinely straddles the
// boundary (e.g. the 30s scene at the end of Segment B keeps 15s of itself).
export const DHYH_MIN_SCENE_CLIP_OVERLAP_SECONDS = 0.5

// Legacy aliases – a few places still import these; keep them pointing at the splice
// window so nothing silently breaks (the scene re-anchor in scenes.ts doesn't use
// them anymore, it uses the segment constants above).
export const DHYH_CLIP_START_SECONDS = DHYH_SEGMENT_A_SOURCE_START
export const DHYH_CLIP_END_SECONDS = DHYH_SEGMENT_B_SOURCE_END

// The shipped MP4 is already the splice – so the <video> element's currentTime maps
// 1:1 onto clip time and no offset is needed. We keep the env hook around only to
// satisfy existing code paths / future customizations; the default is 0.
export const DHYH_VIDEO_SOURCE_OFFSET_SECONDS = envNumber(
  'VITE_DHYH_VIDEO_SOURCE_OFFSET_SECONDS',
  0
)

// ---------- Pause-overlay CTA windows (clip-time seconds) ----------------
//
// "PAUSE TO SHOP" is a hint surfaced during playback to invite the viewer
// to pause and reveal the product carousel. The two pause-triggered ad
// modes share the same overlay component but differ on when the CTA
// shows and (for CTA Pause) when the overlay is allowed to surface at
// all.
//
// Organic Pause:
//   - CTA: shown only during the first `DHYH_ORGANIC_PAUSE_CTA_END_SECONDS`
//     of playback. Acts as an early hint; once it fades the user is
//     expected to know the affordance exists.
//   - Pause overlay: surfaces on *any* pause once the user has begun
//     playback, regardless of whether the CTA was visible.
//
// CTA Pause:
//   - CTA: shown only inside one of `DHYH_CTA_PAUSE_WINDOWS`.
//   - Pause overlay: only surfaces if the pause happened inside one of
//     those same windows. Pausing outside leaves the player in normal
//     (carousel-less) paused state.
//
// Windows are inclusive on both ends. Bump or split the array when the
// editorial team finalises the moments where pause-to-shop should be
// available. Times are clip-time seconds (`panelTimelineSeconds` axis),
// not source-time on the original 44-min episode.
export const DHYH_ORGANIC_PAUSE_CTA_END_SECONDS = 15

export type DhyhPauseWindow = { readonly start: number; readonly end: number }

export const DHYH_CTA_PAUSE_WINDOWS: ReadonlyArray<DhyhPauseWindow> = [
  { start: 77, end: 107 }, //  1:17 →  1:47
  { start: 153, end: 532 }, //  2:33 →  8:52
] as const
