import type { AdPlaybackOption } from '../types'
import type { AdModeDefinition, AdModeRegistry } from './types'
import { syncMode } from './modes/sync/config'
import { syncLbarMode } from './modes/sync-lbar/config'
import { syncImpulseMode } from './modes/sync-impulse/config'
import { pauseAdMode } from './modes/pause-ad/config'
import { ctaPauseMode } from './modes/cta-pause/config'
import { organicPauseMode } from './modes/organic-pause/config'
import { carouselShopMode } from './modes/carousel-shop/config'
import { companionMode } from './modes/companion/config'

/**
 * Single source of truth for every ad mode the app knows about.
 *
 * To add a new mode: create `modes/<id>/config.ts` (export an
 * `AdModeDefinition`), import it here, and add the entry. See
 * `README.md` for the full cookbook.
 *
 * To enable a disabled mode: edit its `config.ts` to set `enabled: true`
 * and fill in the dhyh* fields if it triggers a sync ad break.
 */
export const AD_MODE_REGISTRY: AdModeRegistry = {
  Sync: syncMode,
  'Sync: L-Bar': syncLbarMode,
  'Sync: Impulse': syncImpulseMode,
  'Pause Ad': pauseAdMode,
  'CTA Pause': ctaPauseMode,
  'Organic Pause': organicPauseMode,
  'Carousel Shop': carouselShopMode,
  Companion: companionMode,
}

/** All known mode ids (enabled + disabled). */
export const ALL_AD_MODE_IDS = Object.keys(AD_MODE_REGISTRY) as AdPlaybackOption[]

/** Just the enabled modes — what the dropdown actually shows. */
export const ENABLED_AD_MODE_IDS = ALL_AD_MODE_IDS.filter(
  (id) => AD_MODE_REGISTRY[id].enabled
)

/**
 * Resolve a definition by id. Always returns a valid entry because the
 * registry is keyed by the AdPlaybackOption type union.
 */
export const getAdMode = (id: AdPlaybackOption): AdModeDefinition => AD_MODE_REGISTRY[id]

/**
 * Behavior signal for "this mode triggers a sync-style video ad break"
 * (currently true for `Sync`, `Sync: L-Bar`, `Sync: Impulse`). The audit
 * for this is whether the mode supplies a DHYH duration; modes without
 * a duration can't trigger the break. Useful in the playback hook to
 * collapse the trio of `isSync*ModeSelected` flags into one check.
 */
export const isSyncAdBreakMode = (id: AdPlaybackOption): boolean => {
  const mode = AD_MODE_REGISTRY[id]
  return mode.enabled && typeof mode.dhyhAdDurationSeconds === 'number'
}
