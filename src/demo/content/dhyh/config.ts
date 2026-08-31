import { envString } from '../../utils/env'
import type { ContentConfig } from '../types'
import {
  DHYH_AD_BREAK_CLIP_SECONDS,
  DHYH_CLIP_DURATION_SECONDS,
  DHYH_CONTENT_ID,
  DHYH_VIDEO_URL,
} from './timeline'
import syncFixtures from './ads/sync.json'
import syncLbarFixtures from './ads/sync-lbar.json'
import syncImpulseFixtures from './ads/sync-impulse.json'
import pauseAdFixtures from './ads/pause-ad.json'

/**
 * "Don't Hate Your House" content config.
 *
 * `defaultAdModes` covers Tiers 1 and 2 (Basic / Advanced Scene) plus
 * the universally-available `Pause Ad` mode. Tier 3 (Exact Product
 * Match) additionally exposes the pause-triggered overlay modes
 * (`CTA Pause`, `Organic Pause`) — those rely on per-product detail
 * payloads that only Tier 3 surfaces.
 *
 * `adAssets` carries every per-mode creative + compliance JSON DHYH
 * needs — moved here from `src/demo/ad-modes/modes/*\/config.ts` on
 * 2026-06-15 as part of the per-content isolation refactor. Each
 * content tile now fully owns its ad data; no content reads another
 * content's assets.
 */
export const dhyhContentConfig: ContentConfig = {
  id: DHYH_CONTENT_ID,
  title: "Don't Hate Your House",
  clipDurationSeconds: DHYH_CLIP_DURATION_SECONDS,
  videoUrl: DHYH_VIDEO_URL,
  // DHYH's ad break sits at the Segment A / Segment B splice point
  // (mid-clip, 1:47). Playback order is Segment A → Ad → Segment B.
  adBreakClipSeconds: DHYH_AD_BREAK_CLIP_SECONDS,
  hiddenTaxonomies: ['Brand Safety'],
  defaultAdModes: ['Sync', 'Sync: L-Bar', 'Sync: Impulse', 'Pause Ad'],
  adModesByTier: {
    'Exact Product Match': [
      'Sync',
      'Sync: L-Bar',
      'Sync: Impulse',
      'Pause Ad',
      'CTA Pause',
      'Organic Pause',
    ],
  },
  adAssets: {
    Sync: {
      videoUrl: envString(
        'VITE_DHYH_SYNC_AD_VIDEO_URL',
        '/assets/ads/SD-HD-Tools-Sync.mp4'
      ),
      // 45-second sync ad — longer than Impulse/L-Bar because it doesn't
      // include an interactive companion or L-bar element.
      durationSeconds: 45,
      compliancePayload: syncFixtures as Record<string, unknown>,
    },
    'Sync: L-Bar': {
      videoUrl: envString(
        'VITE_DHYH_LBAR_AD_VIDEO_URL',
        '/assets/ads/SD-HD-Tools-L-bar.mp4'
      ),
      durationSeconds: 30,
      compliancePayload: syncLbarFixtures as Record<string, unknown>,
    },
    'Sync: Impulse': {
      videoUrl: envString(
        'VITE_DHYH_IMPULSE_AD_VIDEO_URL',
        '/assets/ads/SD-HD-Tools-Impulse-1080.mp4'
      ),
      durationSeconds: 30,
      compliancePayload: syncImpulseFixtures as Record<string, unknown>,
    },
    'Pause Ad': {
      imageUrl: envString(
        'VITE_DHYH_PAUSE_AD_IMAGE_URL',
        '/assets/ads/dhyh-pause-ad.png'
      ),
      compliancePayload: pauseAdFixtures as Record<string, unknown>,
      responseLabel: '_PauseAd Response',
    },
  },
}
