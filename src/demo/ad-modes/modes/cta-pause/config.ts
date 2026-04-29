import type { AdModeDefinition } from '../../types'

// CTA Pause — disabled stub. The legacy non-DHYH "in-content CTA" path in
// useDemoPlayback still references this id (`shouldShowInContentCta`); enabling
// it again will require either restoring the placeholder content's CTA flow or
// reimagining it for DHYH.
export const ctaPauseMode: AdModeDefinition = {
  id: 'CTA Pause',
  label: 'CTA Pause',
  enabled: false,
}
