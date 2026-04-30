import { ENABLED_AD_MODE_IDS } from '../ad-modes'
import type { AdPlaybackOption, TierOption } from '../types'
import { dhyhContentConfig } from './dhyh/config'
import type { ContentConfig } from './types'

export type { ContentConfig } from './types'

/**
 * Registry of all content configs the build knows about, keyed by content id.
 *
 * To add a new tile:
 *   1. Create `src/demo/content/<id>/` with `config.ts` (exporting a
 *      `ContentConfig`) and `timeline.ts` for content-specific constants.
 *   2. Drop tier JSONs under `<id>/tiers/` and register the bundled loaders
 *      in `src/demo/sources/resolveTierPayload.ts`.
 *   3. Import the config here and add the entry below.
 *
 * The shell (`useDemoPlayback`, `DemoView`) reads everything content-specific
 * through this registry — it never imports a content's `config.ts` directly.
 */
export const CONTENT_REGISTRY: Record<string, ContentConfig> = {
  [dhyhContentConfig.id]: dhyhContentConfig,
}

export const getContentConfig = (id: string): ContentConfig | null =>
  CONTENT_REGISTRY[id] ?? null

/**
 * Resolve the list of ad modes available for a given content + tier
 * combination. Falls back to the content's `defaultAdModes` when the tier
 * has no explicit override, then filters against the globally-enabled
 * registry (`ENABLED_AD_MODE_IDS`) so a per-content list can never surface
 * a mode the build has disabled. When `contentId` is unknown, returns the
 * full enabled set (the demo always renders something playable).
 */
export const getAvailableAdModes = (
  contentId: string | null | undefined,
  tier: TierOption
): AdPlaybackOption[] => {
  if (!contentId) return [...ENABLED_AD_MODE_IDS]
  const config = getContentConfig(contentId)
  if (!config) return [...ENABLED_AD_MODE_IDS]
  const list = config.adModesByTier?.[tier] ?? config.defaultAdModes
  return list.filter((id) => ENABLED_AD_MODE_IDS.includes(id))
}
