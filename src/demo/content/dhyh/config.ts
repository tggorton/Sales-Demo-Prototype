import type { ContentConfig } from '../types'
import { DHYH_CLIP_DURATION_SECONDS, DHYH_CONTENT_ID, DHYH_VIDEO_URL } from './timeline'

/**
 * "Don't Hate Your House" content config.
 *
 * Currently every enabled tier supports the same three Sync ad modes, so
 * `adModesByTier` is omitted and `defaultAdModes` applies across the board.
 * When a tier-exclusive mode lands (e.g. a future Tier-3-only `Carousel
 * Shop`), add an `adModesByTier['Exact Product Match']` entry — the
 * resolver will prefer it over `defaultAdModes` and globally-disabled modes
 * are still filtered out at lookup time.
 */
export const dhyhContentConfig: ContentConfig = {
  id: DHYH_CONTENT_ID,
  title: "Don't Hate Your House",
  clipDurationSeconds: DHYH_CLIP_DURATION_SECONDS,
  videoUrl: DHYH_VIDEO_URL,
  hiddenTaxonomies: ['Brand Safety'],
  defaultAdModes: ['Sync', 'Sync: L-Bar', 'Sync: Impulse'],
}
