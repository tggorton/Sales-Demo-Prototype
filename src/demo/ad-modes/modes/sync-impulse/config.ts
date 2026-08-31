import type { AdModeDefinition } from '../../types'

// Pure metadata. Per-content Impulse creative / duration / compliance
// live on `ContentConfig.adAssets['Sync: Impulse']`.
export const syncImpulseMode: AdModeDefinition = {
  id: 'Sync: Impulse',
  label: 'Sync: Impulse',
  enabled: true,
  kind: 'sync-ad-break',
}
