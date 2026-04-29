import { envString } from '../../../utils/env'
import type { AdModeDefinition } from '../../types'
import fixtures from './fixtures.json'

export const syncMode: AdModeDefinition = {
  id: 'Sync',
  label: 'Sync',
  enabled: true,
  // 45-second sync ad — longer than Impulse/L-Bar because it doesn't
  // include an interactive companion or L-bar element.
  dhyhAdDurationSeconds: 45,
  dhyhAdVideoUrl: envString('VITE_DHYH_SYNC_AD_VIDEO_URL', '/assets/ads/SD-HD-Tools-Sync.mp4'),
  dhyhCompliancePayload: fixtures as Record<string, unknown>,
}
