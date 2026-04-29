import { envString } from '../../../utils/env'
import type { AdModeDefinition } from '../../types'
import fixtures from './fixtures.json'

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
