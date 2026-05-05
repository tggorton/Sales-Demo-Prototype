import type { AdModeDefinition } from '../../types'

// Organic Pause — pause-triggered overlay ad mode. Tier-3 only on DHYH
// (gated via `dhyhContentConfig.adModesByTier`). Same family as CTA Pause;
// both still flow through `shouldShowInContentCta` in the playback hook
// today and will share the new pause-overlay component when it lands.
export const organicPauseMode: AdModeDefinition = {
  id: 'Organic Pause',
  label: 'Organic Pause',
  enabled: true,
}
