import { envString } from '../../../utils/env'
import type { AdModeDefinition } from '../../types'
// DHYH's L-Bar compliance payload. Lives under `content/dhyh/ads/`
// per the per-content-org rule — when Content #2 lands, it'll bring
// its own `content/<id>/ads/sync-lbar.json` and the mode config will
// route by content id. For now there's only one consumer.
import fixtures from '../../../content/dhyh/ads/sync-lbar.json'

export const syncLbarMode: AdModeDefinition = {
  id: 'Sync: L-Bar',
  label: 'Sync: L-Bar',
  enabled: true,
  dhyhAdDurationSeconds: 30,
  dhyhAdVideoUrl: envString('VITE_DHYH_LBAR_AD_VIDEO_URL', '/assets/ads/SD-HD-Tools-L-bar.mp4'),
  dhyhCompliancePayload: fixtures as Record<string, unknown>,
}
