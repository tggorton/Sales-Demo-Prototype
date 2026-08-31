import type { AdModeDefinition } from '../../types'

// Pure metadata. Per-content L-Bar creative / duration / compliance live
// on `ContentConfig.adAssets['Sync: L-Bar']`.
export const syncLbarMode: AdModeDefinition = {
  id: 'Sync: L-Bar',
  label: 'Sync: L-Bar',
  enabled: true,
  kind: 'sync-ad-break',
}
