// DHYH scene-bundle entry point.
//
// Thin wrapper around `_shared/sceneBuilder.ts` that supplies the DHYH-
// specific behaviours via callbacks: the curated editorial-location
// timeline overlay, and (when `DHYH_TIER_TIME_BASE === 'source'`) the
// two-segment source-time → clip-time remapper. With the current
// clip-native DHYH data (`DB-DemoVid1`) the source-splice mapper is
// inactive and the bundle is built from the scene's own clip-time
// stamps; the constants stay in place so a future re-cut against the
// 44-min source can flip the flag.
//
// Re-exports the shared types so existing consumers that import from
// `'../content/dhyh/scenes'` keep compiling. New consumers should import
// from `'../content/_shared/sceneBuilder'`.

import {
  DHYH_CLIP_DURATION_SECONDS,
  DHYH_CONTENT_ID,
  DHYH_LOCATION_TIMELINE,
  DHYH_MIN_SCENE_CLIP_OVERLAP_SECONDS,
  DHYH_SEGMENT_A_DURATION,
  DHYH_SEGMENT_A_SOURCE_END,
  DHYH_SEGMENT_A_SOURCE_START,
  DHYH_SEGMENT_B_SOURCE_END,
  DHYH_SEGMENT_B_SOURCE_START,
  DHYH_TIER_TIME_BASE,
} from './timeline'
import {
  getScenesForContent as sharedGetScenesForContent,
  type ClipRange,
  type ResolvedLocation,
  type SceneBundle,
  type TierScene,
} from '../_shared/sceneBuilder'
import type { TierOption } from '../../types'

// Re-export shared types so existing consumers keep compiling.
export type { SceneBundle as DhyhSceneBundle } from '../_shared/sceneBuilder'
export { getScenesForContent } from '../_shared/sceneBuilder'

// ───── DHYH editorial-location timeline overlay ─────────────────────────────

/** Resolve which curated `DHYH_LOCATION_TIMELINE` entry is active at a given
 *  clip-time. The active entry is the one with the largest `fromSec` that is
 *  still ≤ `clipTime`. */
const dhyhEditorialLocationOverlay = (clipStartSec: number): ResolvedLocation | null => {
  let active: (typeof DHYH_LOCATION_TIMELINE)[number] | null = null
  for (const entry of DHYH_LOCATION_TIMELINE) {
    if (entry.fromSec <= clipStartSec) active = entry
    else break
  }
  if (!active) return null
  return {
    name: active.location,
    confidence: active.confidence,
    source: 'editorial_timeline',
  }
}

// ───── DHYH source-time → clip-time remapper ────────────────────────────────
//
// The shipped video is a concat of two source ranges (Segment A + Segment B).
// This helper maps a scene's source-time window onto the spliced clip
// timeline, or returns null if the scene doesn't intersect either segment.
// Only consulted when `DHYH_TIER_TIME_BASE === 'source'`; today's clip-native
// data uses the default clip-native mapper inside `_shared/sceneBuilder.ts`.

const dhyhSourceSpliceMapper = (scene: TierScene): ClipRange | null => {
  const sourceStart = scene.startTime
  const sourceEnd = scene.endTime
  // Segment A: source [SEG_A_START, SEG_A_END] → clip [0, SEG_A_DURATION]
  if (sourceEnd > DHYH_SEGMENT_A_SOURCE_START && sourceStart < DHYH_SEGMENT_A_SOURCE_END) {
    const start = Math.max(0, sourceStart - DHYH_SEGMENT_A_SOURCE_START)
    const end = Math.min(DHYH_SEGMENT_A_DURATION, sourceEnd - DHYH_SEGMENT_A_SOURCE_START)
    if (end - start < DHYH_MIN_SCENE_CLIP_OVERLAP_SECONDS) return null
    return { start, end }
  }
  // Segment B: source [SEG_B_START, SEG_B_END] → clip [SEG_A_DURATION, CLIP_DURATION]
  if (sourceEnd > DHYH_SEGMENT_B_SOURCE_START && sourceStart < DHYH_SEGMENT_B_SOURCE_END) {
    const start = Math.max(
      DHYH_SEGMENT_A_DURATION,
      DHYH_SEGMENT_A_DURATION + (sourceStart - DHYH_SEGMENT_B_SOURCE_START)
    )
    const end = Math.min(
      DHYH_CLIP_DURATION_SECONDS,
      DHYH_SEGMENT_A_DURATION + (sourceEnd - DHYH_SEGMENT_B_SOURCE_START)
    )
    if (end - start < DHYH_MIN_SCENE_CLIP_OVERLAP_SECONDS) return null
    return { start, end }
  }
  return null
}

// ───── DHYH entry point ─────────────────────────────────────────────────────

/** Tier loader for DHYH. Wraps the shared `getScenesForContent` with the
 *  DHYH editorial-location overlay and (conditionally) the source-splice
 *  range mapper. */
export const getDhyhScenesForTier = (tier: TierOption): Promise<SceneBundle> =>
  sharedGetScenesForContent(DHYH_CONTENT_ID, tier, {
    clipDurationSeconds: DHYH_CLIP_DURATION_SECONDS,
    editorialLocationOverlay: dhyhEditorialLocationOverlay,
    sceneToClipRangeMapper:
      DHYH_TIER_TIME_BASE === 'source' ? dhyhSourceSpliceMapper : undefined,
  })
