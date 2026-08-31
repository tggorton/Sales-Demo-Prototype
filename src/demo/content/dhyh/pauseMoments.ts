// DHYH pause-moments — content-specific resolvers.
//
// Owns only the DHYH-specific JSON documents and the resolver exports.
// Every type and helper that other contents share is imported from
// `_shared/pauseMoments.ts`; that module is the single home for
// `PauseMomentScene` / `PauseMomentCampaign` / `buildPauseOverlayPayload`
// / `extractCtaImageUrl` etc.

import type { PauseOverlayPayload } from '../../components/player/pause-overlay'
import {
  buildPauseOverlayPayload,
  findActiveSceneInDocument,
  type PauseMomentCampaign,
  type PauseMomentScene,
  type PauseMomentsDocument,
} from '../_shared/pauseMoments'
import { DHYH_CONTENT_ID } from './timeline'
import pauseMomentsJson from './ads/cta-pause.json'
import organicPauseMomentsJson from './ads/organic-pause.json'

// Re-export shared types + builder so existing consumers that imported
// from `'../content/dhyh/pauseMoments'` keep compiling. New consumers
// should import directly from `'../content/_shared/pauseMoments'`.
export {
  buildPauseOverlayPayload,
  type PauseMomentCampaign,
  type PauseMomentScene,
  type PauseMomentsDocument,
} from '../_shared/pauseMoments'

// JSON documents — cast through `unknown` because the file contains
// a few informational keys (`_note`, theme color overrides we ignore,
// etc.) that aren't on the typed contract. Treating the import as the
// typed document is a deliberate trim.
const ctaPauseDocument = pauseMomentsJson as unknown as PauseMomentsDocument
const organicPauseDocument =
  organicPauseMomentsJson as unknown as PauseMomentsDocument

/** CTA Pause active-scene resolver — looks up against DHYH's
 *  `ads/cta-pause.json` (partner-supplied editorial windows). */
export function getActivePauseMomentScene(
  clipSeconds: number
): { scene: PauseMomentScene; campaign: PauseMomentCampaign } | null {
  return findActiveSceneInDocument(ctaPauseDocument, clipSeconds)
}

/** Organic Pause active-scene resolver — looks up against DHYH's
 *  `ads/organic-pause.json` (auto-generated from `tier3.json`). */
export function getActiveOrganicMomentScene(
  clipSeconds: number
): { scene: PauseMomentScene; campaign: PauseMomentCampaign } | null {
  return findActiveSceneInDocument(organicPauseDocument, clipSeconds)
}

/** Convenience wrapper: clip-time → CTA Pause payload (or null if no
 *  moment is active). Used by `useDemoPlayback` to drive the CTA Pause
 *  overlay contents from the timeline. */
export function getActivePauseOverlayPayload(
  clipSeconds: number
): PauseOverlayPayload | null {
  const match = getActivePauseMomentScene(clipSeconds)
  if (!match) return null
  return buildPauseOverlayPayload(match.scene, match.campaign, DHYH_CONTENT_ID)
}

/** Organic Pause counterpart — clip-time → Organic Pause payload. */
export function getActiveOrganicOverlayPayload(
  clipSeconds: number
): PauseOverlayPayload | null {
  const match = getActiveOrganicMomentScene(clipSeconds)
  if (!match) return null
  return buildPauseOverlayPayload(match.scene, match.campaign, DHYH_CONTENT_ID)
}
