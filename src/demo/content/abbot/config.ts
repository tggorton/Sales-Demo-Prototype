import type { ContentConfig } from '../types'
import { envString } from '../../utils/env'
import {
  ABBOT_AD_BREAK_CLIP_SECONDS,
  ABBOT_CLIP_DURATION_SECONDS,
  ABBOT_CONTENT_ID,
  ABBOT_VIDEO_URL,
} from './timeline'
// Compliance payloads still borrowed from DHYH — see the note below.
import syncFixtures from '../dhyh/ads/sync.json'
import syncLbarFixtures from '../dhyh/ads/sync-lbar.json'
import syncImpulseFixtures from '../dhyh/ads/sync-impulse.json'
import pauseAdFixtures from '../dhyh/ads/pause-ad.json'

/**
 * "Abbott Elementary" content config.
 *
 * Every ad mode is now content-native:
 *   - `Sync` / `Sync: L-Bar` / `Sync: Impulse`
 *       Abbott x Walmart creatives in /assets/ads/abbot/ — all three 30s,
 *       1920x1080 h264. (The previous DHYH placeholders were Home-Depot
 *       tools spots, and Sync was declared 45s to match one of them.)
 *   - `Pause Ad`
 *       /assets/pause-overlay/abbot/pause-ad.png — 970x250, the same banner
 *       spec BB / MasterChef / SummerHouse ship.
 *   - `CTA Pause`     ← ./ads/cta-pause.json
 *   - `Organic Pause` ← ./ads/organic-pause.json
 *       Generated from THIS content's tier3.json, so products, imagery and
 *       timestamps are Abbott's own.
 *
 * STILL BORROWED: the `compliancePayload` on the four ad-break modes is
 * DHYH's fixture JSON. No Abbott compliance payloads were delivered with the
 * creatives, so the JSON panel shows DHYH's ad-response shape for those four
 * modes. Everything a viewer sees on screen is Abbott's. Drop real payloads
 * into ./ads/ and swap the four imports above when they arrive.
 *
 * Creatives remain overridable per-environment through the `VITE_ABBOT_*`
 * env vars without editing this file.
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
        '/assets/ads/abbot/Abbott-Walmart-Sync.mp4'
      ),
      // 30-second sync ad (actual 30.00s)
      durationSeconds: 30,
      compliancePayload: syncFixtures as Record<string, unknown>,
    },
    'Sync: L-Bar': {
      videoUrl: envString(
        'VITE_ABBOT_LBAR_AD_VIDEO_URL',
        '/assets/ads/abbot/Abbott-Walmart-L-Bar.mp4'
      ),
      // 30-second L-Bar (actual 30.04s)
      durationSeconds: 30,
      compliancePayload: syncLbarFixtures as Record<string, unknown>,
    },
    'Sync: Impulse': {
      videoUrl: envString(
        'VITE_ABBOT_IMPULSE_AD_VIDEO_URL',
        '/assets/ads/abbot/Abbott-Walmart-Impulse.mp4'
      ),
      // 30-second Impulse (actual 30.04s)
      durationSeconds: 30,
      compliancePayload: syncImpulseFixtures as Record<string, unknown>,
    },
    'Pause Ad': {
      imageUrl: envString(
        'VITE_ABBOT_PAUSE_AD_IMAGE_URL',
        '/assets/pause-overlay/abbot/pause-ad.png'
      ),
      compliancePayload: pauseAdFixtures as Record<string, unknown>,
      responseLabel: '_PauseAd Response',
    },
  },
}
