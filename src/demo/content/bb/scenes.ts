// Big Brother Australia scene-bundle entry point.
//
// Thin wrapper around `_shared/sceneBuilder.ts`. BB's data is clip-native
// and ships without any curated editorial-location overlay, so no callbacks
// are supplied — the shared default clip-native mapper runs and the
// Location panel uses whatever the per-scene JSON exposes.

import {
  getScenesForContent as sharedGetScenesForContent,
  type SceneBundle,
} from '../_shared/sceneBuilder'
import { BB_CLIP_DURATION_SECONDS, BB_CONTENT_ID } from './timeline'
import type { TierOption } from '../../types'

export type BbSceneBundle = SceneBundle

export const getBbScenesForTier = (
  tier: TierOption
): Promise<BbSceneBundle> =>
  sharedGetScenesForContent(BB_CONTENT_ID, tier, {
    clipDurationSeconds: BB_CLIP_DURATION_SECONDS,
  })
