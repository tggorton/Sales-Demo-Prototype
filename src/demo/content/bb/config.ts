import { envString } from '../../utils/env'
import type { ContentConfig } from '../types'
import {
  BB_AD_BREAK_CLIP_SECONDS,
  BB_CLIP_DURATION_SECONDS,
  BB_CONTENT_ID,
  BB_VIDEO_URL,
} from './timeline'
import syncCompliance from './ads/sync-compliance.json'
import pauseAdFixtures from './ads/pause-ad.json'

/**
 * "Big Brother Australia" content config.
 *
 * Ad-mode status (2026-06-18):
 *   - `Sync` / `Sync: L-Bar` / `Sync: Impulse` ENABLED — Macy's-branded
 *     creatives at `/assets/ads/bb/*.mp4`. Shared compliance JSON at
 *     `src/demo/content/bb/ads/sync-compliance.json` (the base ad creative
 *     is the same across all three sync modes). Tail-anchored ad break:
 *     `adBreakClipSeconds === clipDurationSeconds` (271.052s), so the
 *     single ad break renders at the very end (mirrors MC + RHW).
 *   - `Pause Ad` ENABLED on every tier — static Macy's Furniture creative
 *     at `/assets/pause-overlay/bb/pause-ad.png`. Compliance JSON at
 *     `src/demo/content/bb/ads/pause-ad.json`.
 *   - `CTA Pause` + `Organic Pause` ENABLED on the `Exact Product Match`
 *     tier ONLY — pause-overlay modes need the per-product detail payloads
 *     that only T3 surfaces. Driven by `ads/cta-pause.json` +
 *     `ads/organic-pause.json` (both auto-generated from `tier3.json`).
 *     CTA windows are 1:34 → 2:34 (starts inside the first shoppable scene
 *     at 93s) and 2:45 → 3:45 (see timeline.ts `BB_CTA_PAUSE_WINDOWS`).
 *
 * `adAssets` owns every creative + compliance JSON BB needs. No code path
 * here references any other content's ads folder — adding or removing this
 * tile leaves the other content untouched.
 *
 * Taxonomy panels (Object, IAB, GARM, Sentiment, Location, Emotion, Faces,
 * Logo), the Product panel, and the JSON panel all light up from the tier
 * JSONs directly — those are NOT gated by ad modes.
 */
export const bbContentConfig: ContentConfig = {
  id: BB_CONTENT_ID,
  title: 'Big Brother Australia',
  clipDurationSeconds: BB_CLIP_DURATION_SECONDS,
  videoUrl: BB_VIDEO_URL,
  // Tail-anchored: ad break starts the moment content finishes. There is
  // no Segment B — playback ends after the ad. Mirrors MC + RHW.
  adBreakClipSeconds: BB_AD_BREAK_CLIP_SECONDS,
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
        'VITE_BB_SYNC_AD_VIDEO_URL',
        '/assets/ads/bb/BigBrother-Macys-Sync.mp4'
      ),
      // 30-second sync ad (actual 29.63s)
      durationSeconds: 30,
      compliancePayload: syncCompliance as Record<string, unknown>,
    },
    'Sync: L-Bar': {
      videoUrl: envString(
        'VITE_BB_LBAR_AD_VIDEO_URL',
        '/assets/ads/bb/BigBrother-Macys-L-Bar.mp4'
      ),
      // 15-second L-Bar (actual 15.07s)
      durationSeconds: 15,
      // Shared compliance — Sync / Sync: L-Bar / Sync: Impulse use the
      // same base creative, so all three modes reference one file.
      compliancePayload: syncCompliance as Record<string, unknown>,
    },
    'Sync: Impulse': {
      videoUrl: envString(
        'VITE_BB_IMPULSE_AD_VIDEO_URL',
        '/assets/ads/bb/BigBrother-Macys-Impulse.mp4'
      ),
      // 15-second Impulse (actual 15.10s)
      durationSeconds: 15,
      compliancePayload: syncCompliance as Record<string, unknown>,
    },
    'Pause Ad': {
      imageUrl: envString(
        'VITE_BB_PAUSE_AD_IMAGE_URL',
        '/assets/pause-overlay/bb/pause-ad.png'
      ),
      compliancePayload: pauseAdFixtures as Record<string, unknown>,
      responseLabel: '_PauseAd Response',
    },
  },
}
