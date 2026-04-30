import { describe, expect, it } from 'vitest'
import {
  resolveActiveSceneIndex,
  resolveTaxonomyAvailability,
} from '../../src/demo/utils/sceneState'
import type { SceneMetadata, TaxonomyOption } from '../../src/demo/types'

const ALL_TAXONOMIES: readonly TaxonomyOption[] = [
  'IAB',
  'Location',
  'Sentiment',
  'Brand Safety',
  'Faces',
  'Emotion',
  'Object',
]

const sceneAt = (id: number, start: number, end: number): SceneMetadata => ({
  id: `scene-${id}`,
  start,
  end,
  sceneLabel: `Scene ${id}`,
  emotion: '',
  emotionScore: 0,
  considered: '',
  reasoning: '',
  textData: '',
  musicEmotion: '',
  musicScore: 0,
  cta: '',
  products: [],
})

describe('resolveActiveSceneIndex', () => {
  it('returns -1 for empty scenes', () => {
    expect(resolveActiveSceneIndex([], 50)).toBe(-1)
  })

  it('returns the index of the scene whose window contains the time (fast path)', () => {
    const scenes = [sceneAt(0, 0, 10), sceneAt(1, 10, 20), sceneAt(2, 20, 30)]
    expect(resolveActiveSceneIndex(scenes, 5)).toBe(0)
    expect(resolveActiveSceneIndex(scenes, 15)).toBe(1)
    expect(resolveActiveSceneIndex(scenes, 25)).toBe(2)
  })

  it('uses half-open intervals: scene.start inclusive, scene.end exclusive', () => {
    const scenes = [sceneAt(0, 0, 10), sceneAt(1, 10, 20)]
    // 10 is the boundary — belongs to scene 1, not scene 0
    expect(resolveActiveSceneIndex(scenes, 10)).toBe(1)
  })

  it('returns -1 when time is before the first scene starts', () => {
    const scenes = [sceneAt(0, 100, 110)]
    expect(resolveActiveSceneIndex(scenes, 50)).toBe(-1)
  })

  it('returns the most-recent-past scene when time falls in a gap between scenes', () => {
    // Gap: scene 0 ends at 10, scene 1 starts at 20 — time = 15.
    const scenes = [sceneAt(0, 0, 10), sceneAt(1, 20, 30)]
    expect(resolveActiveSceneIndex(scenes, 15)).toBe(0)
  })

  it('returns the last scene whose start <= time when past the clip end', () => {
    // Clip ends at 30 — time = 1000. Should pick the last scene, not -1.
    const scenes = [sceneAt(0, 0, 10), sceneAt(1, 10, 20), sceneAt(2, 20, 30)]
    expect(resolveActiveSceneIndex(scenes, 1000)).toBe(2)
  })

  it('does NOT snap to the last scene index when in a gap before any scene starts', () => {
    // Pin the bug fix: the OLD fallback returned `scenes.length - 1` for any
    // miss, which made gap-between-scenes flicker to the very last scene
    // and back. The fix is to return -1 when time is before scenes[0].start.
    const scenes = [sceneAt(0, 100, 110), sceneAt(1, 110, 120)]
    expect(resolveActiveSceneIndex(scenes, 50)).toBe(-1)
  })
})

describe('resolveTaxonomyAvailability (3-layer gating)', () => {
  const baseOpts = {
    hiddenTaxonomies: [] as TaxonomyOption[],
    tierWhitelist: ALL_TAXONOMIES,
    allTaxonomies: ALL_TAXONOMIES,
    isContentDataDriven: false,
    hasDataForOption: () => true,
  }

  it('returns false for every option when nothing matches the whitelist', () => {
    const result = resolveTaxonomyAvailability({
      ...baseOpts,
      tierWhitelist: [],
    })
    for (const option of ALL_TAXONOMIES) {
      expect(result[option]).toBe(false)
    }
  })

  it('layer 1 — per-content hides override everything below', () => {
    // Tier whitelist allows everything, content data-driven says yes,
    // but `hiddenTaxonomies` includes Brand Safety → still false.
    const result = resolveTaxonomyAvailability({
      ...baseOpts,
      hiddenTaxonomies: ['Brand Safety'],
      isContentDataDriven: true,
      hasDataForOption: () => true,
    })
    expect(result['Brand Safety']).toBe(false)
    expect(result.IAB).toBe(true)
  })

  it('layer 2 — per-tier whitelist gates BEFORE per-scene data check', () => {
    // Pin HANDOFF-relevant invariant: a tier that doesn't list Location
    // CANNOT have Location enabled even if a scene has location data
    // (the editorial timeline retrofits one). The whitelist runs first.
    const result = resolveTaxonomyAvailability({
      ...baseOpts,
      tierWhitelist: ['IAB', 'Sentiment', 'Brand Safety'], // Tier 1
      isContentDataDriven: true,
      hasDataForOption: () => true, // every scene has every option's data
    })
    expect(result.Location).toBe(false)
    expect(result.IAB).toBe(true)
  })

  it('layer 3 — per-scene data presence gates DHYH-style content', () => {
    const result = resolveTaxonomyAvailability({
      ...baseOpts,
      isContentDataDriven: true,
      hasDataForOption: (option) => option === 'IAB', // only IAB has data
    })
    expect(result.IAB).toBe(true)
    expect(result.Sentiment).toBe(false)
    expect(result.Location).toBe(false)
  })

  it('non-data-driven content is enabled when the whitelist includes the option (no per-scene check)', () => {
    // Placeholder content path: if the tier whitelist allows it, it's on.
    // The `hasDataForOption` predicate is never consulted.
    let predicateCalls = 0
    const result = resolveTaxonomyAvailability({
      ...baseOpts,
      isContentDataDriven: false,
      hasDataForOption: () => {
        predicateCalls++
        return false
      },
    })
    expect(result.IAB).toBe(true)
    expect(predicateCalls).toBe(0)
  })

  it('result preserves the ordering of allTaxonomies (every option present)', () => {
    const result = resolveTaxonomyAvailability(baseOpts)
    for (const option of ALL_TAXONOMIES) {
      expect(option in result).toBe(true)
    }
  })

  it('hidden + not-in-whitelist + no-data all collapse to false (no false-positive)', () => {
    const result = resolveTaxonomyAvailability({
      ...baseOpts,
      hiddenTaxonomies: ['Object'],
      tierWhitelist: ['IAB', 'Sentiment'],
      isContentDataDriven: true,
      hasDataForOption: () => false,
    })
    expect(result.IAB).toBe(false) // whitelisted but no data
    expect(result.Object).toBe(false) // hidden
    expect(result.Location).toBe(false) // not whitelisted
  })
})
