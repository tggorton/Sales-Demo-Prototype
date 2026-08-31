import { envString } from '../../utils/env'
import type { ContentConfig } from '../types'
import {
  RHW_AD_BREAK_CLIP_SECONDS,
  RHW_CLIP_DURATION_SECONDS,
  RHW_CONTENT_ID,
  RHW_VIDEO_URL,
} from './timeline'
import syncCompliance from './ads/sync-compliance.json'
import pauseAdFixtures from './ads/pause-ad.json'

/**
 * "Real Housewives of Salt Lake City" content config.
 *
 * Ad-mode status (2026-06-16):
 *   - `Sync` / `Sync: L-Bar` / `Sync: Impulse` ENABLED — Wayfair-branded
 *     Furniture creatives at `/assets/ads/rhw/*.mp4`. Shared compliance JSON
 *     at `src/demo/content/rhw/ads/sync-compliance.json` (the base ad
 *     creative is the same across all three sync modes). Tail-anchored ad
 *     break: `adBreakClipSeconds === clipDurationSeconds` (255.78s), so the
 *     single ad break renders at the very end of the clip (mirrors MC).
 *   - `Pause Ad` ENABLED on every tier — static Wayfair creative at
 *     `/assets/pause-overlay/rhw/pause-ad.jpg`. Compliance JSON at
 *     `src/demo/content/rhw/ads/pause-ad.json`.
 *   - `CTA Pause` + `Organic Pause` ENABLED on the `Exact Product Match`
 *     tier — pause-overlay modes driven by `ads/cta-pause.json` +
 *     `ads/organic-pause.json` (both auto-generated from `tier3.json`).
 *     CTA windows are 0:30 → 1:30 and 2:22 → 3:22 (see timeline.ts
 *     `RHW_CTA_PAUSE_WINDOWS`).
 *
 * `adAssets` owns every creative + compliance JSON RHW needs. No code path
 * here references DHYH's or MasterChef's ads folder — adding or removing
 * this tile leaves the other content untouched.
 *
 * Taxonomy panels (Object, IAB, GARM, Sentiment, Location, Emotion, Faces,
 * Logo), the Product panel, and the JSON panel all light up from the tier
 * JSONs directly — those are NOT gated by ad modes.
 */
export const rhwContentConfig: ContentConfig = {
  id: RHW_CONTENT_ID,
  title: 'Real Housewives of Salt Lake City',
  clipDurationSeconds: RHW_CLIP_DURATION_SECONDS,
  videoUrl: RHW_VIDEO_URL,
  // Tail-anchored: ad break starts the moment content finishes. There is
  // no Segment B — playback ends after the ad. Mirrors MasterChef.
  adBreakClipSeconds: RHW_AD_BREAK_CLIP_SECONDS,
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
        'VITE_RHW_SYNC_AD_VIDEO_URL',
        '/assets/ads/rhw/SD-Wayfair-Furniture-Sync.mp4'
      ),
      // 45-second sync ad (actual 44.60s) — longer than Impulse/L-Bar
      // because it doesn't include an interactive companion or L-bar.
      durationSeconds: 45,
      compliancePayload: syncCompliance as Record<string, unknown>,
    },
    'Sync: L-Bar': {
      videoUrl: envString(
        'VITE_RHW_LBAR_AD_VIDEO_URL',
        '/assets/ads/rhw/SD-Wayfair-Furniture-L-Bar.mp4'
      ),
      durationSeconds: 30,
      // Shared compliance — Sync / Sync: L-Bar / Sync: Impulse use the
      // same base creative, so all three modes reference one file.
      compliancePayload: syncCompliance as Record<string, unknown>,
    },
    'Sync: Impulse': {
      videoUrl: envString(
        'VITE_RHW_IMPULSE_AD_VIDEO_URL',
        '/assets/ads/rhw/SD-Wayfair-Furniture-Impulse.mp4'
      ),
      durationSeconds: 30,
      compliancePayload: syncCompliance as Record<string, unknown>,
    },
    'Pause Ad': {
      imageUrl: envString(
        'VITE_RHW_PAUSE_AD_IMAGE_URL',
        '/assets/pause-overlay/rhw/pause-ad.jpg'
      ),
      compliancePayload: pauseAdFixtures as Record<string, unknown>,
      responseLabel: '_PauseAd Response',
    },
  },
}
