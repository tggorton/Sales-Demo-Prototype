import type { ContentConfig } from '../types'
import { DHYH_CLIP_DURATION_SECONDS, DHYH_CONTENT_ID, DHYH_VIDEO_URL } from './timeline'

/**
 * "Don't Hate Your House" content config.
 *
 * `defaultAdModes` covers Tiers 1 and 2 (Basic / Advanced Scene). Tier 3
 * (Exact Product Match) additionally exposes the pause-triggered overlay
 * modes (`CTA Pause`, `Organic Pause`) — those rely on per-product detail
 * payloads that only Tier 3 surfaces. The `useDemoPlayback` resolver
 * reads `adModesByTier` first and falls back to `defaultAdModes` when the
 * active tier has no override; either way the result is intersected with
 * the globally-enabled set in the registry.
 */
export const dhyhContentConfig: ContentConfig = {
  id: DHYH_CONTENT_ID,
  title: "Don't Hate Your House",
  clipDurationSeconds: DHYH_CLIP_DURATION_SECONDS,
  videoUrl: DHYH_VIDEO_URL,
  hiddenTaxonomies: ['Brand Safety'],
  defaultAdModes: ['Sync', 'Sync: L-Bar', 'Sync: Impulse'],
  adModesByTier: {
    'Exact Product Match': [
      'Sync',
      'Sync: L-Bar',
      'Sync: Impulse',
      'CTA Pause',
      'Organic Pause',
    ],
  },
}
