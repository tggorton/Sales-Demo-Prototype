import type { AdModeDefinition } from '../../types'

// Companion — disabled stub. Distinct from `Sync: Impulse`'s companion/QR
// behavior; this one is the dedicated companion-only mode.
export const companionMode: AdModeDefinition = {
  id: 'Companion',
  label: 'Companion',
  enabled: false,
}
