import type { AdModeDefinition } from '../../types'

// Pure metadata as of 2026-06-15 — per-content creative video, duration,
// and compliance payload live on each content's
// `ContentConfig.adAssets['Sync']`. See `src/demo/content/dhyh/config.ts`
// for the DHYH wiring.
export const syncMode: AdModeDefinition = {
  id: 'Sync',
  label: 'Sync',
  enabled: true,
  kind: 'sync-ad-break',
}
