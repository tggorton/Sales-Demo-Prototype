import { envString } from '../../utils/env'
import type { ContentConfig } from '../types'
import {
  SH_AD_BREAK_CLIP_SECONDS,
  SH_CLIP_DURATION_SECONDS,
  SH_CONTENT_ID,
  SH_VIDEO_URL,
} from './timeline'
import syncCompliance from './ads/sync-compliance.json'
import pauseAdFixtures from './ads/pause-ad.json'

/**
 * "Summer House" content config.
 *
 * Ad-mode status (2026-06-18):
 *   - `Sync` / `Sync: L-Bar` / `Sync: Impulse` ENABLED — Macy's-branded
 *     creatives at `/assets/ads/sh/*.mp4`. Shared compliance JSON at
 *     `src/demo/content/sh/ads/sync-compliance.json` (the base ad creative
 *     is the same across all three sync modes). Tail-anchored ad break:
 *     `adBreakClipSeconds === clipDurationSeconds` (191.68s), so the
 *     single ad break renders at the very end (mirrors MC + RHW).
 *   - `Pause Ad` ENABLED on every tier — static Macy's Fashion creative
 *     at `/assets/pause-overlay/sh/pause-ad.png`. Compliance JSON at
 *     `src/demo/content/sh/ads/pause-ad.json`.
 *   - `CTA Pause` + `Organic Pause` ENABLED on the `Exact Product Match`
 *     tier ONLY — pause-overlay modes need the per-product detail payloads
 *     that only T3 surfaces. Driven by `ads/cta-pause.json` +
 *     `ads/organic-pause.json` (both auto-generated from `tier3.json`).
 *     CTA windows are 0:30 → 1:30 and 2:00 → 3:00 (see timeline.ts
 *     `SH_CTA_PAUSE_WINDOWS`).
 *
 * `adAssets` owns every creative + compliance JSON SH needs. No code path
 * here references any other content's ads folder — adding or removing this
 * tile leaves the other content untouched.
 *
 * Taxonomy panels (Object, IAB, GARM, Sentiment, Location, Emotion, Faces,
 * Logo), the Product panel, and the JSON panel all light up from the tier
 * JSONs directly — those are NOT gated by ad modes.
 */
export const shContentConfig: ContentConfig = {
  id: SH_CONTENT_ID,
  title: 'Summer House',
  clipDurationSeconds: SH_CLIP_DURATION_SECONDS,
  videoUrl: SH_VIDEO_URL,
  // Tail-anchored: ad break starts the moment content finishes. There is
  // no Segment B — playback ends after the ad. Mirrors MC + RHW.
  adBreakClipSeconds: SH_AD_BREAK_CLIP_SECONDS,
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
        'VITE_SH_SYNC_AD_VIDEO_URL',
        '/assets/ads/sh/SummerHouse-Macys_Sync.mp4'
      ),
      // 30-second sync ad (actual 30.06s)
      durationSeconds: 30,
      compliancePayload: syncCompliance as Record<string, unknown>,
    },
    'Sync: L-Bar': {
      videoUrl: envString(
        'VITE_SH_LBAR_AD_VIDEO_URL',
        '/assets/ads/sh/SummerHouse-L-Bar.mp4'
      ),
      // 15-second L-Bar (actual 15.18s)
      durationSeconds: 15,
      // Shared compliance — Sync / Sync: L-Bar / Sync: Impulse use the
      // same base creative, so all three modes reference one file.
      compliancePayload: syncCompliance as Record<string, unknown>,
    },
    'Sync: Impulse': {
      videoUrl: envString(
        'VITE_SH_IMPULSE_AD_VIDEO_URL',
        '/assets/ads/sh/SummerHouse-Macys_Impulse.mp4'
      ),
      // 15-second Impulse (actual 15.18s)
      durationSeconds: 15,
      compliancePayload: syncCompliance as Record<string, unknown>,
    },
    'Pause Ad': {
      imageUrl: envString(
        'VITE_SH_PAUSE_AD_IMAGE_URL',
        '/assets/pause-overlay/sh/pause-ad.png'
      ),
      compliancePayload: pauseAdFixtures as Record<string, unknown>,
      responseLabel: '_PauseAd Response',
    },
  },
}
