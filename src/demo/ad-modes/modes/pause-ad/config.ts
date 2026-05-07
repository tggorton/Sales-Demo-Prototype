import { envString } from '../../../utils/env'
import type { AdModeDefinition } from '../../types'
// DHYH's Pause Ad compliance payload. Lives under `content/dhyh/ads/`
// per the per-content-org rule (see `sync-lbar/config.ts`). Today this
// is a duplicate of L-Bar's compliance JSON — swap in the real
// Pause-Ad-specific payload when the partner supplies one.
import fixtures from '../../../content/dhyh/ads/pause-ad.json'

export const pauseAdMode: AdModeDefinition = {
  id: 'Pause Ad',
  label: 'Pause Ad',
  enabled: true,
  // Static banner creative. Bundled under `public/assets/ads/` so it
  // ships at a stable URL alongside the other DHYH ad media. The env
  // override matches the convention the Sync modes use for their video
  // creatives — pointed at a future CDN URL by setting
  // `VITE_DHYH_PAUSE_AD_IMAGE_URL` at build time.
  dhyhPauseAdImageUrl: envString(
    'VITE_DHYH_PAUSE_AD_IMAGE_URL',
    '/assets/ads/dhyh-pause-ad.png'
  ),
  dhyhCompliancePayload: fixtures as Record<string, unknown>,
  // Future ad formats whose response shape reads differently from
  // Sync's `_AdBreak-{1|2} Response` set their own label. Pause Ad
  // surfaces under `_PauseAd Response` in the JSON panel.
  dhyhAdResponseLabel: '_PauseAd Response',
}
