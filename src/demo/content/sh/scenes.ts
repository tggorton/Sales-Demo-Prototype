// Summer House scene-bundle entry point.
//
// Thin wrapper around `_shared/sceneBuilder.ts`. SH's data is clip-native
// and ships without any curated editorial-location overlay, so no callbacks
// are supplied — the shared default clip-native mapper runs and the
// Location panel uses whatever the per-scene JSON exposes.

import {
  getScenesForContent as sharedGetScenesForContent,
  type SceneBundle,
} from '../_shared/sceneBuilder'
import { SH_CLIP_DURATION_SECONDS, SH_CONTENT_ID } from './timeline'
import type { TierOption } from '../../types'

export type ShSceneBundle = SceneBundle

export const getShScenesForTier = (
  tier: TierOption
): Promise<ShSceneBundle> =>
  sharedGetScenesForContent(SH_CONTENT_ID, tier, {
    clipDurationSeconds: SH_CLIP_DURATION_SECONDS,
  })
