import type {
  ContentCategory,
  JsonDownloadOption,
  SyncImpulseSegment,
  TaxonomyOption,
  TierOption,
} from './types'
import { envString } from './utils/env'

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

// Per-tier taxonomy whitelist. The dropdown only surfaces taxonomies that
// the upstream tier JSON actually emits — Tier 1 ships IAB + Sentiment +
// Brand Safety only, Tier 2 adds music_emotion / locations / faces /
// objects, Tier 3 layers product_match data on top. We enforce this
// whitelist BEFORE the per-scene data-presence check because the editorial
// DHYH_LOCATION_TIMELINE retrofits a location for every clip-time
// regardless of whether the model actually emitted one — without this
// whitelist Location would (incorrectly) light up at Basic Scene because
// every scene gets a timeline-derived label.
//
// Add a new TierOption -> taxonomies entry when introducing a new tier
// JSON; entries default to no taxonomies if missing (everything filtered
// out, panel renders empty).
export const TAXONOMIES_AVAILABLE_BY_TIER: Record<TierOption, TaxonomyOption[]> = {
  'Assets Summary': ['IAB', 'Sentiment', 'Brand Safety'],
  'Basic Scene': ['IAB', 'Sentiment', 'Brand Safety'],
  'Advanced Scene': [
    'IAB',
    'Sentiment',
    'Brand Safety',
    'Emotion',
    'Location',
    'Faces',
    'Object',
  ],
  'Categorical Product Match': [
    'IAB',
    'Sentiment',
    'Brand Safety',
    'Emotion',
    'Location',
    'Faces',
    'Object',
  ],
  'Exact Product Match': [
    'IAB',
    'Sentiment',
    'Brand Safety',
    'Emotion',
    'Location',
    'Faces',
    'Object',
  ],
}

// Per-content taxonomy hides moved to `src/demo/content/<id>/config.ts` —
// each ContentConfig declares its own `hiddenTaxonomies` field. The shell
// reads it via `getContentConfig(id)` from `src/demo/content/`.

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
// 90s default chosen in Phase 9e: the previous 180s window left a noticeable gap
// in DHYH around clip-time 03:00–04:00 where every upstream-emitted product had
// already appeared earlier and got deduped, so the Products panel stayed parked on
// scene 64 (~02:52) for a full minute while playback advanced to 03:52. Dropping
// to 90s lets recurring products re-emerge once per ~1.5-min beat, which keeps
// the panel tracking playback more closely without re-introducing the original
// "same item every other card" spam (the original problem was 1–10s adjacent
// emissions, not 60–90s spacing).
//
// Set to 0 to disable dedupe entirely (useful for QA / side-by-side comparison).
export const PRODUCT_DEDUPE_WINDOW_SECONDS = 90

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

// DHYH-specific constants moved to `src/demo/content/dhyh/timeline.ts` in
// Phase 5a. Import from there (or via the per-content config in
// `src/demo/content/`) — this file only carries app-wide / non-content
// constants going forward.

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
