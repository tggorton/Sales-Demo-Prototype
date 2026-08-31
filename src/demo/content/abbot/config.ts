import type { ContentConfig } from '../types'
import { envString } from '../../utils/env'
import {
  ABBOT_AD_BREAK_CLIP_SECONDS,
  ABBOT_CLIP_DURATION_SECONDS,
  ABBOT_CONTENT_ID,
  ABBOT_VIDEO_URL,
} from './timeline'
// Placeholder compliance payloads borrowed from DHYH — see the note below.
import syncFixtures from '../dhyh/ads/sync.json'
import syncLbarFixtures from '../dhyh/ads/sync-lbar.json'
import syncImpulseFixtures from '../dhyh/ads/sync-impulse.json'
import pauseAdFixtures from '../dhyh/ads/pause-ad.json'

/**
 * "Abbott Elementary" content config.
 *
 * REAL, content-native ad modes:
 *   - `CTA Pause`     ← ./ads/cta-pause.json
 *   - `Organic Pause` ← ./ads/organic-pause.json
 * Both are generated from THIS content's tier3.json, so their products,
 * imagery and timestamps are Abbott's own.
 *
 * PLACEHOLDER modes (`Sync`, `Sync: L-Bar`, `Sync: Impulse`, `Pause Ad`)
 * reuse DHYH's creatives and compliance fixtures so the mode switcher is
 * demonstrable before Abbott creatives exist. They are Home-Depot tools
 * spots and are NOT contextually correct for this content — swap them via
 * the `VITE_ABBOT_*` env vars or by editing `adAssets` once the real
 * creatives land, then regenerate nothing (pause modes are independent).
 */
export const abbotContentConfig: ContentConfig = {
  id: ABBOT_CONTENT_ID,
  title: 'Abbott Elementary',
  clipDurationSeconds: ABBOT_CLIP_DURATION_SECONDS,
  videoUrl: ABBOT_VIDEO_URL,
  adBreakClipSeconds: ABBOT_AD_BREAK_CLIP_SECONDS,
  hiddenTaxonomies: [],
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
        'VITE_ABBOT_SYNC_AD_VIDEO_URL',
        '/assets/ads/SD-HD-Tools-Sync.mp4'
      ),
      durationSeconds: 45,
      compliancePayload: syncFixtures as Record<string, unknown>,
    },
    'Sync: L-Bar': {
      videoUrl: envString(
        'VITE_ABBOT_LBAR_AD_VIDEO_URL',
        '/assets/ads/SD-HD-Tools-L-bar.mp4'
      ),
      durationSeconds: 30,
      compliancePayload: syncLbarFixtures as Record<string, unknown>,
    },
    'Sync: Impulse': {
      videoUrl: envString(
        'VITE_ABBOT_IMPULSE_AD_VIDEO_URL',
        '/assets/ads/SD-HD-Tools-Impulse-1080.mp4'
      ),
      durationSeconds: 30,
      compliancePayload: syncImpulseFixtures as Record<string, unknown>,
    },
    'Pause Ad': {
      imageUrl: envString(
        'VITE_ABBOT_PAUSE_AD_IMAGE_URL',
        '/assets/ads/dhyh-pause-ad.png'
      ),
      compliancePayload: pauseAdFixtures as Record<string, unknown>,
      responseLabel: '_PauseAd Response',
    },
  },
}
