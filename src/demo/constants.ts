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
export const PLACEHOLDER_VIDEO_URL = '/assets/video/Placeholder-SalesDemo-Content_Compresssed.mp4'

export const PRODUCT_PLACEHOLDER_IMAGE = '/assets/elements/product-placeholder.svg'

// Don't Hate Your House content-specific assets
export const DHYH_CONTENT_ID = 'dhyh'
export const DHYH_VIDEO_URL = '/assets/video/dhyh-cmp.mp4'
export const DHYH_IMPULSE_AD_VIDEO_URL = '/assets/ads/SD-HD-Tools-Impulse-1080.mp4'
export const DHYH_LBAR_AD_VIDEO_URL = '/assets/ads/SD-HD-Tools-L-bar.mp4'
export const DHYH_SYNC_AD_VIDEO_URL = '/assets/ads/SD-HD-Tools-Sync.mp4'
export const DHYH_IMPULSE_AD_COMPANION_URL = 'https://kerv.social/embed/3/32014'

// Per-mode DHYH ad-break durations (wall-clock). Matches the actual mp4 lengths so the
// scrubber's ad slot is the same length as the creative that plays inside it.
export const DHYH_AD_BREAK_DURATIONS_SECONDS: Record<'Sync: Impulse' | 'Sync: L-Bar' | 'Sync', number> = {
  'Sync: Impulse': 30,
  'Sync: L-Bar': 30,
  Sync: 45,
}

// DHYH clip window: only play a slice of the full 44-minute episode (18:00 – 25:00 of
// the source file). The scrubber UI displays a 7-minute clip, but internally it also
// reserves a 30s slot at 3:32 for the single Sync:Impulse ad break so the user can see
// (and scrub into) the break without extending the displayed duration.
// The demo window in the original DHYH source video (18:00 – 25:00). These values
// still drive *scene JSON re-anchoring* because the upstream tier JSONs index scene
// times against the original full-length video.
export const DHYH_CLIP_START_SECONDS = 18 * 60 // 18:00 – scene-JSON window start
export const DHYH_CLIP_END_SECONDS = 25 * 60 // 25:00 – scene-JSON window end
export const DHYH_CLIP_DURATION_SECONDS = DHYH_CLIP_END_SECONDS - DHYH_CLIP_START_SECONDS
export const DHYH_AD_BREAK_CLIP_SECONDS = (21 - 18) * 60 + 32 // 3:32 inside the clip

// Where the demo window begins inside the actual `.mp4` we ship. The shipped file is
// pre-clipped to 0–420s to stay under GitHub's 100MB per-file limit, so this offset is 0.
// If you swap the source back to the full 44-minute render, set this to 18 * 60.
export const DHYH_VIDEO_SOURCE_OFFSET_SECONDS = 0
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
