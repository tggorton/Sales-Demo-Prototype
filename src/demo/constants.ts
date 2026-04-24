import type {
  AdPlaybackOption,
  ContentCategory,
  JsonDownloadOption,
  SyncImpulseSegment,
  TaxonomyOption,
  TierOption,
} from './types'

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

// Full ad-playback list – kept for reference. Restore modes by adding them back to
// ENABLED_AD_PLAYBACK_OPTIONS once we have creative + compliance JSON for them.
export const ALL_AD_PLAYBACK_OPTIONS: AdPlaybackOption[] = [
  'Pause Ad',
  'CTA Pause',
  'Organic Pause',
  'Carousel Shop',
  'Sync',
  'Sync: L-Bar',
  'Sync: Impulse',
  'Companion',
]
const ENABLED_AD_PLAYBACK_OPTIONS: AdPlaybackOption[] = ['Sync', 'Sync: L-Bar', 'Sync: Impulse']
export const adPlaybackOptions: AdPlaybackOption[] = ALL_AD_PLAYBACK_OPTIONS.filter((opt) =>
  ENABLED_AD_PLAYBACK_OPTIONS.includes(opt)
)

export const taxonomyOptions: TaxonomyOption[] = [
  'IAB',
  'Location',
  'Sentiment',
  'Brand Safety',
  'Faces',
  'Emotion',
  'Object',
]

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

// How long (ms) to pause auto-scrolling after the user scrolls a panel manually.
// Lets the user browse the list freely, then the panel eases back to the live
// playback position once they're idle.
export const PANEL_MANUAL_SCROLL_PAUSE_MS = 3000

// ---------- Media URL overrides -----------------------------------------------------
// Every video asset reads from an environment variable first so individual machines
// (or future staging/prod builds backed by S3/CloudFront) can point the player at
// higher-fidelity or hosted files without any code changes. Defaults resolve to the
// web-optimized files committed under `public/assets/`.
//
// Override locally by copying `.env.example` to `.env.local` and uncommenting the
// keys you want. See `.env.example` for the full list.
const envString = (key: string, fallback: string): string => {
  const value = (import.meta.env as Record<string, string | undefined>)[key]
  return value && value.length > 0 ? value : fallback
}
const envNumber = (key: string, fallback: number): number => {
  const value = (import.meta.env as Record<string, string | undefined>)[key]
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const PLACEHOLDER_VIDEO_URL = envString(
  'VITE_PLACEHOLDER_VIDEO_URL',
  '/assets/video/Placeholder-SalesDemo-Content_Compresssed.mp4'
)

// Don't Hate Your House content-specific assets
export const DHYH_CONTENT_ID = 'dhyh'
export const DHYH_VIDEO_URL = envString('VITE_DHYH_VIDEO_URL', '/assets/video/dhyh-cmp.mp4')
export const DHYH_IMPULSE_AD_VIDEO_URL = envString(
  'VITE_DHYH_IMPULSE_AD_VIDEO_URL',
  '/assets/ads/SD-HD-Tools-Impulse-1080.mp4'
)
export const DHYH_LBAR_AD_VIDEO_URL = envString(
  'VITE_DHYH_LBAR_AD_VIDEO_URL',
  '/assets/ads/SD-HD-Tools-L-bar.mp4'
)
export const DHYH_SYNC_AD_VIDEO_URL = envString(
  'VITE_DHYH_SYNC_AD_VIDEO_URL',
  '/assets/ads/SD-HD-Tools-Sync.mp4'
)
export const DHYH_IMPULSE_AD_COMPANION_URL = 'https://kerv.social/embed/3/32014'

// Per-mode DHYH ad-break durations (wall-clock). Matches the actual mp4 lengths so the
// scrubber's ad slot is the same length as the creative that plays inside it.
export const DHYH_AD_BREAK_DURATIONS_SECONDS: Record<'Sync: Impulse' | 'Sync: L-Bar' | 'Sync', number> = {
  'Sync: Impulse': 30,
  'Sync: L-Bar': 30,
  Sync: 45,
}

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

// REFERENCE: tune these if we revisit collapsed-title viewport centering behavior.
export const DEFAULT_MACBOOK_VIEWPORT_MAX_WIDTH = 1600
export const DEFAULT_MACBOOK_VIEWPORT_MAX_HEIGHT = 1000
