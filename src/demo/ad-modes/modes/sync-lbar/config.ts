import { envString } from '../../../utils/env'
import type { AdModeDefinition } from '../../types'
import fixtures from './fixtures.json'

export const syncLbarMode: AdModeDefinition = {
  id: 'Sync: L-Bar',
  label: 'Sync: L-Bar',
  enabled: true,
  dhyhAdDurationSeconds: 30,
  dhyhAdVideoUrl: envString('VITE_DHYH_LBAR_AD_VIDEO_URL', '/assets/ads/SD-HD-Tools-L-bar.mp4'),
  dhyhCompliancePayload: fixtures as Record<string, unknown>,
}
