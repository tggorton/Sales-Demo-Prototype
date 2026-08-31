import { ENABLED_AD_MODE_IDS } from '../ad-modes'
import type { AdPlaybackOption, TierOption } from '../types'
import { dhyhContentConfig } from './dhyh/config'
import { abbotContentConfig } from './abbot/config'
import { bbContentConfig } from './bb/config'
import { shContentConfig } from './sh/config'
import { rhwContentConfig } from './rhw/config'
import {
  ABBOT_CTA_PAUSE_WINDOWS,
  ABBOT_ORGANIC_PAUSE_CTA_END_SECONDS,
} from './abbot/timeline'
import {
  getActiveOrganicMomentScene as abbotGetActiveOrganicMomentScene,
  getActiveOrganicOverlayPayload as abbotGetActiveOrganicOverlayPayload,
  getActivePauseMomentScene as abbotGetActivePauseMomentScene,
  getActivePauseOverlayPayload as abbotGetActivePauseOverlayPayload,
} from './abbot/pauseMoments'
import {
  DHYH_CTA_PAUSE_WINDOWS,
  DHYH_ORGANIC_PAUSE_CTA_END_SECONDS,
} from './dhyh/timeline'
import {
  getActiveOrganicMomentScene as dhyhGetActiveOrganicMomentScene,
  getActiveOrganicOverlayPayload as dhyhGetActiveOrganicOverlayPayload,
  getActivePauseMomentScene as dhyhGetActivePauseMomentScene,
  getActivePauseOverlayPayload as dhyhGetActivePauseOverlayPayload,
} from './dhyh/pauseMoments'
import type {
  PauseMomentCampaign,
  PauseMomentScene,
} from './_shared/pauseMoments'
import { masterchefContentConfig } from './masterchef/config'
import {
  MASTERCHEF_CTA_PAUSE_WINDOWS,
  MASTERCHEF_ORGANIC_PAUSE_CTA_END_SECONDS,
} from './masterchef/timeline'
import {
  getActiveOrganicMomentScene as mcGetActiveOrganicMomentScene,
  getActiveOrganicOverlayPayload as mcGetActiveOrganicOverlayPayload,
  getActivePauseMomentScene as mcGetActivePauseMomentScene,
  getActivePauseOverlayPayload as mcGetActivePauseOverlayPayload,
} from './masterchef/pauseMoments'
import {
  RHW_CTA_PAUSE_WINDOWS,
  RHW_ORGANIC_PAUSE_CTA_END_SECONDS,
} from './rhw/timeline'
import {
  getActiveOrganicMomentScene as rhwGetActiveOrganicMomentScene,
  getActiveOrganicOverlayPayload as rhwGetActiveOrganicOverlayPayload,
  getActivePauseMomentScene as rhwGetActivePauseMomentScene,
  getActivePauseOverlayPayload as rhwGetActivePauseOverlayPayload,
} from './rhw/pauseMoments'
import {
  SH_CTA_PAUSE_WINDOWS,
  SH_ORGANIC_PAUSE_CTA_END_SECONDS,
} from './sh/timeline'
import {
  getActiveOrganicMomentScene as shGetActiveOrganicMomentScene,
  getActiveOrganicOverlayPayload as shGetActiveOrganicOverlayPayload,
  getActivePauseMomentScene as shGetActivePauseMomentScene,
  getActivePauseOverlayPayload as shGetActivePauseOverlayPayload,
} from './sh/pauseMoments'
import {
  BB_CTA_PAUSE_WINDOWS,
  BB_ORGANIC_PAUSE_CTA_END_SECONDS,
} from './bb/timeline'
import {
  getActiveOrganicMomentScene as bbGetActiveOrganicMomentScene,
  getActiveOrganicOverlayPayload as bbGetActiveOrganicOverlayPayload,
  getActivePauseMomentScene as bbGetActivePauseMomentScene,
  getActivePauseOverlayPayload as bbGetActivePauseOverlayPayload,
} from './bb/pauseMoments'
import type { PauseOverlayPayload } from '../components/player/pause-overlay'
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
  [abbotContentConfig.id]: abbotContentConfig,
  [bbContentConfig.id]: bbContentConfig,
  [shContentConfig.id]: shContentConfig,
  [rhwContentConfig.id]: rhwContentConfig,
  [masterchefContentConfig.id]: masterchefContentConfig,
}

/**
 * Ids of content tiles that ship bundled tier JSONs (and thus drive the
 * Taxonomy / Product / JSON panels from real data instead of placeholder
 * SCENE_METADATA). Derived from the registry so a new content automatically
 * opts in to bundle-driven playback as soon as it's registered above + has
 * a `bundledTierLoaders` entry in `src/demo/sources/resolveTierPayload.ts`.
 *
 * Consumed by `useDemoPlayback` to gate the bundle-driven code paths;
 * adding a new content does NOT require editing the hook.
 */
export const BUNDLED_CONTENT_IDS: ReadonlySet<string> = new Set(
  Object.keys(CONTENT_REGISTRY)
)

export const getContentConfig = (id: string): ContentConfig | null =>
  CONTENT_REGISTRY[id] ?? null

// ────────────────────────────────────────────────────────────────────────────
// Pause-moments registry — per-content resolvers + CTA-window constants
// ────────────────────────────────────────────────────────────────────────────
//
// One entry per content tile that ships `ads/cta-pause.json` +
// `ads/organic-pause.json`. `useDemoPlayback` reads this registry to drive the
// pause-overlay surfaces; adding a new content tile with pause moments is
// "register here + done" — no hook edit.
//
// `ctaPauseWindows` MUST mirror the values passed to
// `scripts/generate-cta-pause-moments.mjs` for the same content (the script's
// `--windows` flag and this constant are two sides of the same contract).

export type ContentPauseMomentsModule = {
  getActivePauseMomentScene: (
    clipSeconds: number
  ) => { scene: PauseMomentScene; campaign: PauseMomentCampaign } | null
  getActiveOrganicMomentScene: (
    clipSeconds: number
  ) => { scene: PauseMomentScene; campaign: PauseMomentCampaign } | null
  getActivePauseOverlayPayload: (clipSeconds: number) => PauseOverlayPayload | null
  getActiveOrganicOverlayPayload: (clipSeconds: number) => PauseOverlayPayload | null
  /** Editorial windows during which CTA Pause's pause-to-shop hint is visible. */
  ctaPauseWindows: ReadonlyArray<{ readonly start: number; readonly end: number }>
  /** Clip-time seconds after which the Organic Pause CTA hint stops fading in. */
  organicPauseCtaEndSeconds: number
}

export const PAUSE_MOMENTS_REGISTRY: Record<string, ContentPauseMomentsModule> = {
  [dhyhContentConfig.id]: {
    getActivePauseMomentScene: dhyhGetActivePauseMomentScene,
    getActiveOrganicMomentScene: dhyhGetActiveOrganicMomentScene,
    getActivePauseOverlayPayload: dhyhGetActivePauseOverlayPayload,
    getActiveOrganicOverlayPayload: dhyhGetActiveOrganicOverlayPayload,
    ctaPauseWindows: DHYH_CTA_PAUSE_WINDOWS,
    organicPauseCtaEndSeconds: DHYH_ORGANIC_PAUSE_CTA_END_SECONDS,
  },
  [masterchefContentConfig.id]: {
    getActivePauseMomentScene: mcGetActivePauseMomentScene,
    getActiveOrganicMomentScene: mcGetActiveOrganicMomentScene,
    getActivePauseOverlayPayload: mcGetActivePauseOverlayPayload,
    getActiveOrganicOverlayPayload: mcGetActiveOrganicOverlayPayload,
    ctaPauseWindows: MASTERCHEF_CTA_PAUSE_WINDOWS,
    organicPauseCtaEndSeconds: MASTERCHEF_ORGANIC_PAUSE_CTA_END_SECONDS,
  },
  [rhwContentConfig.id]: {
    getActivePauseMomentScene: rhwGetActivePauseMomentScene,
    getActiveOrganicMomentScene: rhwGetActiveOrganicMomentScene,
    getActivePauseOverlayPayload: rhwGetActivePauseOverlayPayload,
    getActiveOrganicOverlayPayload: rhwGetActiveOrganicOverlayPayload,
    ctaPauseWindows: RHW_CTA_PAUSE_WINDOWS,
    organicPauseCtaEndSeconds: RHW_ORGANIC_PAUSE_CTA_END_SECONDS,
  },
  [shContentConfig.id]: {
    getActivePauseMomentScene: shGetActivePauseMomentScene,
    getActiveOrganicMomentScene: shGetActiveOrganicMomentScene,
    getActivePauseOverlayPayload: shGetActivePauseOverlayPayload,
    getActiveOrganicOverlayPayload: shGetActiveOrganicOverlayPayload,
    ctaPauseWindows: SH_CTA_PAUSE_WINDOWS,
    organicPauseCtaEndSeconds: SH_ORGANIC_PAUSE_CTA_END_SECONDS,
  },
  [abbotContentConfig.id]: {
    getActivePauseMomentScene: abbotGetActivePauseMomentScene,
    getActiveOrganicMomentScene: abbotGetActiveOrganicMomentScene,
    getActivePauseOverlayPayload: abbotGetActivePauseOverlayPayload,
    getActiveOrganicOverlayPayload: abbotGetActiveOrganicOverlayPayload,
    ctaPauseWindows: ABBOT_CTA_PAUSE_WINDOWS,
    organicPauseCtaEndSeconds: ABBOT_ORGANIC_PAUSE_CTA_END_SECONDS,
  },
  [bbContentConfig.id]: {
    getActivePauseMomentScene: bbGetActivePauseMomentScene,
    getActiveOrganicMomentScene: bbGetActiveOrganicMomentScene,
    getActivePauseOverlayPayload: bbGetActivePauseOverlayPayload,
    getActiveOrganicOverlayPayload: bbGetActiveOrganicOverlayPayload,
    ctaPauseWindows: BB_CTA_PAUSE_WINDOWS,
    organicPauseCtaEndSeconds: BB_ORGANIC_PAUSE_CTA_END_SECONDS,
  },
}

export const getPauseMomentsForContent = (
  id: string | null | undefined
): ContentPauseMomentsModule | null =>
  id ? PAUSE_MOMENTS_REGISTRY[id] ?? null : null

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
