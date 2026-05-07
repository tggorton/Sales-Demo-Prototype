import { envString } from '../../../utils/env'
import type { AdModeDefinition } from '../../types'
// DHYH's Impulse compliance payload. Lives under `content/dhyh/ads/`
// per the per-content-org rule (see `sync-lbar/config.ts`).
import fixtures from '../../../content/dhyh/ads/sync-impulse.json'

export const syncImpulseMode: AdModeDefinition = {
  id: 'Sync: Impulse',
  label: 'Sync: Impulse',
  enabled: true,
  dhyhAdDurationSeconds: 30,
  dhyhAdVideoUrl: envString(
    'VITE_DHYH_IMPULSE_AD_VIDEO_URL',
    '/assets/ads/SD-HD-Tools-Impulse-1080.mp4'
  ),
  dhyhCompliancePayload: fixtures as Record<string, unknown>,
}
