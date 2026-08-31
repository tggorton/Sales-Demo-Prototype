import { envString } from '../../utils/env'
import type { ContentConfig } from '../types'
import {
  MASTERCHEF_AD_BREAK_CLIP_SECONDS,
  MASTERCHEF_CLIP_DURATION_SECONDS,
  MASTERCHEF_CONTENT_ID,
  MASTERCHEF_VIDEO_URL,
} from './timeline'
import syncCompliance from './ads/sync-compliance.json'
import pauseAdFixtures from './ads/pause-ad.json'

/**
 * "MasterChef Australia" content config.
 *
 * Ad-mode status (2026-06-16):
 *   - `Sync` / `Sync: L-Bar` / `Sync: Impulse` ENABLED — Wayfair-branded
 *     MC Kitchen creatives at `/assets/ads/masterchef/*.mp4`. Shared
 *     compliance JSON at `src/demo/content/masterchef/ads/sync-compliance.json`
 *     (the base ad creative is the same across all three sync modes).
 *   - `Pause Ad` ENABLED on every tier — static Wayfair-Kitchen creative
 *     at `/assets/pause-overlay/masterchef/pause-ad.png`. Compliance JSON
 *     at `src/demo/content/masterchef/ads/pause-ad.json`.
 *   - `CTA Pause` + `Organic Pause` ENABLED on the `Exact Product Match`
 *     tier — pause-overlay modes driven by `ads/cta-pause.json` +
 *     `ads/organic-pause.json` (both auto-generated from `tier3.json`).
 *     CTA windows are 0:30 → 1:15 and 2:15 → 3:15 (see timeline.ts
 *     `MASTERCHEF_CTA_PAUSE_WINDOWS`).
 *
 * `adAssets` owns every creative + compliance JSON MasterChef needs.
 * Per the 2026-06-15 isolation refactor: no MasterChef code path
 * references DHYH's `content/dhyh/ads/*.json` or `/assets/ads/dhyh-*`
 * — adding or removing this tile leaves DHYH untouched, and vice versa.
 *
 * Taxonomy panels (Object, IAB, GARM, Sentiment, Location, Emotion, Faces,
 * Logo), the Product panel, and the JSON panel all light up from the tier
 * JSONs directly — those are NOT gated by ad modes.
 */
export const masterchefContentConfig: ContentConfig = {
  id: MASTERCHEF_CONTENT_ID,
  title: 'MasterChef Australia',
  clipDurationSeconds: MASTERCHEF_CLIP_DURATION_SECONDS,
  videoUrl: MASTERCHEF_VIDEO_URL,
  // Tail-anchored: ad break starts the moment content finishes. There is
  // no Segment B — playback ends after the ad. Differs from DHYH's
  // mid-clip splice.
  adBreakClipSeconds: MASTERCHEF_AD_BREAK_CLIP_SECONDS,
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
        'VITE_MASTERCHEF_SYNC_AD_VIDEO_URL',
        '/assets/ads/masterchef/SD-Wayfair-MC-Kitchen-Sync.mp4'
      ),
      // 45-second sync ad (actual 44.59s) — longer than Impulse/L-Bar
      // because it doesn't include an interactive companion or L-bar.
      durationSeconds: 45,
      compliancePayload: syncCompliance as Record<string, unknown>,
    },
    'Sync: L-Bar': {
      videoUrl: envString(
        'VITE_MASTERCHEF_LBAR_AD_VIDEO_URL',
        '/assets/ads/masterchef/SD-Wayfair-MC-Kitchen-L-Bar.mp4'
      ),
      durationSeconds: 30,
      // Shared compliance — Sync / Sync: L-Bar / Sync: Impulse use the
      // same base creative, so all three modes reference one file.
      compliancePayload: syncCompliance as Record<string, unknown>,
    },
    'Sync: Impulse': {
      videoUrl: envString(
        'VITE_MASTERCHEF_IMPULSE_AD_VIDEO_URL',
        '/assets/ads/masterchef/SD-Wayfair-MC-Kitchen-Impulse.mp4'
      ),
      durationSeconds: 30,
      compliancePayload: syncCompliance as Record<string, unknown>,
    },
    'Pause Ad': {
      imageUrl: envString(
        'VITE_MASTERCHEF_PAUSE_AD_IMAGE_URL',
        '/assets/pause-overlay/masterchef/pause-ad.png'
      ),
      compliancePayload: pauseAdFixtures as Record<string, unknown>,
      responseLabel: '_PauseAd Response',
    },
  },
}
