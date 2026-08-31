// Abbott Elementary scene-bundle entry point.
//
// Thin wrapper around `_shared/sceneBuilder.ts`. Abbott's tier data is
// clip-native (the clip starts at 0:00, so source time IS clip time) and
// ships without a curated editorial-location overlay, so no callbacks are
// supplied — the shared default clip-native mapper runs and the Location
// panel uses the per-scene JSON verbatim.

import {
  getScenesForContent as sharedGetScenesForContent,
  type SceneBundle,
} from '../_shared/sceneBuilder'
import { ABBOT_CLIP_DURATION_SECONDS, ABBOT_CONTENT_ID } from './timeline'
import type { TierOption } from '../../types'

export type AbbotSceneBundle = SceneBundle

export const getAbbotScenesForTier = (
  tier: TierOption
): Promise<AbbotSceneBundle> =>
  sharedGetScenesForContent(ABBOT_CONTENT_ID, tier, {
    clipDurationSeconds: ABBOT_CLIP_DURATION_SECONDS,
  })
