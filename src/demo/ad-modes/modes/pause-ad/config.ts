import type { AdModeDefinition } from '../../types'

// Pure metadata. Per-content Pause Ad image URL, compliance JSON, and
// response label live on `ContentConfig.adAssets['Pause Ad']`.
export const pauseAdMode: AdModeDefinition = {
  id: 'Pause Ad',
  label: 'Pause Ad',
  enabled: true,
  kind: 'pause-ad',
}
