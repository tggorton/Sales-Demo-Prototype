import type {
  ContentCategory,
  JsonDownloadOption,
  SyncImpulseSegment,
  TaxonomyOption,
  TierOption,
} from './types'
import { envNumber, envString } from './utils/env'

// Full category list – kept for reference. Toggle ENABLED_CATEGORIES below to restore
// the categories we're currently hiding while the demo focuses on DHYH.
export const ALL_CATEGORIES: ContentCategory[] = [
  'All',
  'Reality TV',
  'Comedy',
  'Drama',
  'Home & Garden',
]
// Only categories that apply to "Don't Hate Your House" are shown right now.
const ENABLED_CATEGORIES: ContentCategory[] = ['All', 'Reality TV', 'Home & Garden']
export const categories: ContentCategory[] = ALL_CATEGORIES.filter((c) =>
  ENABLED_CATEGORIES.includes(c)
)

// Full tier list – kept for reference. Add/remove ids in ENABLED_TIER_OPTIONS to
// change what's visible in the content-selection modal.
export const ALL_TIER_OPTIONS: TierOption[] = [
  'Assets Summary',
  'Basic Scene',
  'Advanced Scene',
  'Categorical Product Match',
  'Exact Product Match',
]
const ENABLED_TIER_OPTIONS: TierOption[] = ['Basic Scene', 'Advanced Scene', 'Exact Product Match']
export const tierOptions: TierOption[] = ALL_TIER_OPTIONS.filter((t) =>
  ENABLED_TIER_OPTIONS.includes(t)
)

// Ad-playback options now live in src/demo/ad-modes/. Use ENABLED_AD_MODE_IDS
// for dropdowns and the registry for per-mode config (durations, video URLs,
// compliance JSON). See src/demo/ad-modes/README.md for the cookbook.

export const taxonomyOptions: TaxonomyOption[] = [
  'IAB',
  'Location',
  'Sentiment',
  'Brand Safety',
  'Faces',
  'Emotion',
  'Object',
]

// Per-content taxonomy hide list. Anything listed here is removed from the
// taxonomy dropdown for the matching content even if the underlying JSON has
// data for it – useful when a tier technically emits the field but the
// upstream content team hasn't curated/approved it yet for that specific
// piece of content. Keyed by `ContentItem.id` so adding a new piece of
// content with its own hide rules is just a new entry.
export const HIDDEN_TAXONOMIES_BY_CONTENT: Record<string, TaxonomyOption[]> = {
  // DHYH ("Don't Hate Your House"): Brand Safety data exists in the JSON but
  // isn't curated for this clip yet, so hide it for now. Other clips can opt
  // in by leaving the entry off this list.
  dhyh: ['Brand Safety'],
}

export const jsonDownloadOptions: JsonDownloadOption[] = ['Original JSON', 'Summary JSON']

export const TOTAL_DURATION_SECONDS = 32 * 60 + 20
export const DEFAULT_START_SECONDS = 4 * 60 + 31
export const SYNC_IMPULSE_DURATION_SECONDS = 60 + 30 + 60 + 30 + 60

export const SYNC_IMPULSE_SEGMENTS: SyncImpulseSegment[] = [
  { start: 0, end: 60, kind: 'content' },
  { start: 60, end: 90, kind: 'ad-break-1' },
  { start: 90, end: 150, kind: 'content' },
  { start: 150, end: 180, kind: 'ad-break-2' },
  { start: 180, end: SYNC_IMPULSE_DURATION_SECONDS, kind: 'content' },
]

export const AD_BREAK_1_IMAGE = '/assets/ads/ad-1-impulse-target.png'
export const AD_BREAK_2_IMAGE = '/assets/ads/ad-2-impulse-target.png'
export const AD_QR_DESTINATION_1 = 'https://kerv.social/embed/3/32014'
export const AD_QR_DESTINATION_2 = 'https://kerv.social/embed/3/32015'
export const AD_QR_IMAGE_1 = `https://quickchart.io/qr?size=260&margin=0&text=${encodeURIComponent(AD_QR_DESTINATION_1)}`
export const AD_QR_IMAGE_2 = `https://quickchart.io/qr?size=260&margin=0&text=${encodeURIComponent(AD_QR_DESTINATION_2)}`

export const PRODUCT_PLACEHOLDER_IMAGE = '/assets/elements/product-placeholder.svg'

// ---------- Product panel dedupe window ---------------------------------------------
// Upstream analysis JSON frequently flags the same product across several adjacent
// scenes, which made the Product panel feel spammy (the same item would stack 3–5
// times in rapid succession). We suppress a product from re-appearing in the panel
// if the previous emission of the same product is within this many seconds on the
// playback timeline. A gap larger than the window lets the product reappear so the
// temporal narrative (product returns later in the content) is preserved.
//
// Set to 0 to disable dedupe entirely (useful for QA / side-by-side comparison).
export const PRODUCT_DEDUPE_WINDOW_SECONDS = 180

// Time-windowed dedupe for taxonomy panel cards. Same shape as the products
// dedupe but a *much tighter* default. Why: products have many distinct keys
// (Hammer, Drill, Tape Measure, …) so a 180s window still produces a steady
// flow of cards. Taxonomy headlines are usually a single value per scene that
// runs unchanged for tens of seconds (e.g. Music Emotion stays "Energizing,
// pump-up" for ~100s straight). With a 180s window the panel collapses to a
// single card per clip, which reads as "the panel is broken / out of sync".
//
// A short window (~8s) is the sweet spot:
//   - Adjacent / back-to-back scenes (<8s apart) with the same headline still
//     collapse, so the panel never spams 3–5 identical cards in a row.
//   - Scenes more than ~8s apart re-emit even if the value is unchanged, so
//     the panel keeps producing cards as playback progresses and the user can
//     scroll back through the clip's narrative.
//   - Tier 3 / DHYH source scenes are mostly 2–5s long, so this maps roughly
//     to "collapse adjacent cuts in the same beat, but show new beats."
//
// Set to 0 to disable taxonomy dedupe entirely (useful for QA).
export const TAXONOMY_DEDUPE_WINDOW_SECONDS = 8

// How long (ms) to pause auto-scrolling after the user scrolls a panel manually.
// Lets the user browse the list freely. The pause is tracked *per panel*, so
// scrolling the Taxonomy panel does not pause auto-scroll on Products or JSON.
// After the pause expires the panel snaps to the current live target in a
// single frame (no animated catch-up) and then resumes normal smooth tracking.
export const PANEL_MANUAL_SCROLL_PAUSE_MS = 5000

// Velocity cap for programmatic panel auto-scroll, in CSS pixels per second.
// The RAF loop applies an exponential ease toward its live target, but also
// clamps the per-frame movement to this rate. Normal drift during playback is
// well under the cap; the cap only kicks in during big jumps (scrubs, scene
// skips, re-sync after manual scroll) where we used to dart across the panel
// in ~250 ms. 500px/s gives a smooth settle (~1s over a full panel height)
// that still feels responsive.
export const PANEL_AUTOSCROLL_MAX_VELOCITY_PX_PER_SEC = 500

// ---------- Media URL overrides -----------------------------------------------------
// Every video asset reads from an environment variable first so individual machines
// (or future staging/prod builds backed by S3/CloudFront) can point the player at
// higher-fidelity or hosted files without any code changes. Defaults resolve to the
// web-optimized files committed under `public/assets/`.
//
// Override locally by copying `.env.example` to `.env.local` and uncommenting the
// keys you want. See `.env.example` for the full list.
// envString / envNumber moved to src/demo/utils/env.ts so per-mode configs
// in src/demo/ad-modes/ can share the same VITE_* resolution rules.

export const PLACEHOLDER_VIDEO_URL = envString(
  'VITE_PLACEHOLDER_VIDEO_URL',
  '/assets/video/Placeholder-SalesDemo-Content_Compresssed.mp4'
)

// Don't Hate Your House content-specific assets
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
// that cares about source-time is `dhyhScenes.ts`, which re-anchors each scene from
// the upstream JSON (indexed against the full video) into the spliced clip timeline
// using the constants below.
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
// window so nothing silently breaks (the scene re-anchor in dhyhScenes doesn't use
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
// Scrubber segments and internal duration are computed dynamically per playback mode
// in `useDemoPlayback` (Impulse/L-Bar = 30s, Sync = 45s). The time readout still shows
// the unchanged 7:00 clip duration because displayedCurrentSeconds subtracts ad time.

// Ad-break click behavior: while an ad is playing the entire player area (minus the
// control bar at the bottom) is a single click target that opens the companion
// experience. No per-QR placement tracking is needed – see the overlay in `DemoView`.

export const DEFAULT_USER_NAME = 'John Doe'
export const DEFAULT_USER_EMAIL = 'John.doe@kerv.ai'

// Login credentials accepted by the demo. These are also the values autofilled
// into the login form on load – if the user clears/edits either field away from
// these exact values the login is rejected. This is intentionally hard-coded
// because the sales demo is a prototype without a real auth backend.
export const DEMO_LOGIN_EMAIL = 'user@kerv.ai'
export const DEMO_LOGIN_PASSWORD = 'SalesDemoTest'

// REFERENCE: tune these if we revisit collapsed-title viewport centering behavior.
export const DEFAULT_MACBOOK_VIEWPORT_MAX_WIDTH = 1600
export const DEFAULT_MACBOOK_VIEWPORT_MAX_HEIGHT = 1000
