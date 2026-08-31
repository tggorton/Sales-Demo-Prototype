// Abbott Elementary pause-moments adapter.
//
// Owns only the Abbot-specific JSON documents and the resolver exports.
// Shared types + helpers come from `_shared/pauseMoments.ts` — zero
// references to any other content's folder.
//
// Both pause JSONs are auto-generated:
//   - cta-pause.json     ←  scripts/generate-cta-pause-moments.mjs --content abbot --windows 84-114,180-570
//   - organic-pause.json ←  scripts/generate-organic-pause-moments.mjs --content abbot
//
// Re-run those scripts (in that order) whenever tier3.json changes —
// never hand-edit the JSON.

import type { PauseOverlayPayload } from '../../components/player/pause-overlay'
import {
  buildPauseOverlayPayload,
  findActiveSceneInDocument,
  type PauseMomentCampaign,
  type PauseMomentScene,
  type PauseMomentsDocument,
} from '../_shared/pauseMoments'
import { ABBOT_CONTENT_ID } from './timeline'
import ctaPauseMomentsJson from './ads/cta-pause.json'
import organicPauseMomentsJson from './ads/organic-pause.json'

export {
  buildPauseOverlayPayload,
  type PauseMomentCampaign,
  type PauseMomentScene,
  type PauseMomentsDocument,
} from '../_shared/pauseMoments'

const ctaPauseDocument = ctaPauseMomentsJson as unknown as PauseMomentsDocument
const organicPauseDocument =
  organicPauseMomentsJson as unknown as PauseMomentsDocument

export function getActivePauseMomentScene(
  clipSeconds: number
): { scene: PauseMomentScene; campaign: PauseMomentCampaign } | null {
  return findActiveSceneInDocument(ctaPauseDocument, clipSeconds)
}

export function getActiveOrganicMomentScene(
  clipSeconds: number
): { scene: PauseMomentScene; campaign: PauseMomentCampaign } | null {
  return findActiveSceneInDocument(organicPauseDocument, clipSeconds)
}

export function getActivePauseOverlayPayload(
  clipSeconds: number
): PauseOverlayPayload | null {
  const match = getActivePauseMomentScene(clipSeconds)
  if (!match) return null
  return buildPauseOverlayPayload(match.scene, match.campaign, ABBOT_CONTENT_ID)
}

export function getActiveOrganicOverlayPayload(
  clipSeconds: number
): PauseOverlayPayload | null {
  const match = getActiveOrganicMomentScene(clipSeconds)
  if (!match) return null
  return buildPauseOverlayPayload(match.scene, match.campaign, ABBOT_CONTENT_ID)
}
