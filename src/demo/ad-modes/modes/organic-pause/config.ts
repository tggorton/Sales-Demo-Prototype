import type { AdModeDefinition } from '../../types'

// Organic Pause — disabled stub. Same family as CTA Pause; both flow through
// `shouldShowInContentCta` in the playback hook today.
export const organicPauseMode: AdModeDefinition = {
  id: 'Organic Pause',
  label: 'Organic Pause',
  enabled: false,
}
