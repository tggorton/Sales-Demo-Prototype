import type { AdModeDefinition } from '../../types'

// CTA Pause — pause-triggered overlay ad mode. Tier-3 only on DHYH (gated
// via `dhyhContentConfig.adModesByTier`). The pause-overlay UI itself is
// being scaffolded incrementally; the legacy `shouldShowInContentCta` chip
// in `VideoPlayer.tsx` still fires for now and will be replaced when the
// overlay component lands.
export const ctaPauseMode: AdModeDefinition = {
  id: 'CTA Pause',
  label: 'CTA Pause',
  enabled: true,
}
