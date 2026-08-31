// MasterChef scene-bundle entry point.
//
// Thin wrapper around `_shared/sceneBuilder.ts`. MasterChef's data is
// clip-native and ships without any curated editorial-location overlay,
// so no callbacks are supplied — the shared default clip-native mapper
// runs and the Location panel uses whatever the per-scene JSON exposes.
//
// Imports go straight to `_shared/`; this file references no other
// content's folder.

import {
  getScenesForContent as sharedGetScenesForContent,
  type SceneBundle,
} from '../_shared/sceneBuilder'
import { MASTERCHEF_CLIP_DURATION_SECONDS, MASTERCHEF_CONTENT_ID } from './timeline'
import type { TierOption } from '../../types'

export type MasterchefSceneBundle = SceneBundle

export const getMasterchefScenesForTier = (
  tier: TierOption
): Promise<MasterchefSceneBundle> =>
  sharedGetScenesForContent(MASTERCHEF_CONTENT_ID, tier, {
    clipDurationSeconds: MASTERCHEF_CLIP_DURATION_SECONDS,
  })
