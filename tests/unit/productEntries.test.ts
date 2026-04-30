import { describe, expect, it } from 'vitest'
import {
  buildAllProductEntries,
  buildProductEntries,
  resolveActiveProductIndex,
  splitProductEntriesAroundAdBreak,
} from '../../src/demo/utils/productEntries'
import type { SceneMetadata } from '../../src/demo/types'

// HANDOFF §6 — protected behavior: products from Segment A must not
// leak into the Segment B viewport (and vice versa) when DHYH is in
// Sync: Impulse mode. Earlier code had this fail in subtle ways at
// the splice boundary; pinning the segment-isolation behavior so a
// future refactor can't silently re-introduce the leak.

const baseScene = (
  id: number,
  start: number,
  products: Array<{ id: string; productKey: string; name?: string }> = []
): SceneMetadata => ({
  id: `scene-${id}`,
  start,
  end: start + 10,
  sceneLabel: `Scene ${id}`,
  emotion: '',
  emotionScore: 0,
  considered: '',
  reasoning: '',
  textData: '',
  musicEmotion: '',
  musicScore: 0,
  cta: '',
  products: products.map((p) => ({
    id: p.id,
    productKey: p.productKey,
    name: p.name ?? p.productKey,
    description: '',
    image: '',
  })),
})

describe('buildProductEntries', () => {
  it('returns an empty array for empty input', () => {
    expect(buildProductEntries([], 60)).toEqual([])
  })

  it('flattens products from every scene into a single list, in order', () => {
    const scenes = [
      baseScene(0, 0, [{ id: 'a-id', productKey: 'A' }]),
      baseScene(1, 20, [{ id: 'b-id', productKey: 'B' }]),
    ]
    const result = buildProductEntries(scenes, 0)
    expect(result.map((p) => p.productKey)).toEqual(['A', 'B'])
    expect(result[0]).toMatchObject({
      sceneId: 'scene-0',
      sceneStart: 0,
      sceneLabel: 'Scene 0',
    })
  })

  it('dedupes by productKey within the time window', () => {
    const scenes = [
      baseScene(0, 0, [{ id: 'hammer-1', productKey: 'Hammer' }]),
      baseScene(1, 30, [{ id: 'hammer-2', productKey: 'Hammer' }]),
    ]
    // 30s gap < 60s window → second emission suppressed
    const result = buildProductEntries(scenes, 60)
    expect(result.map((p) => p.productKey)).toEqual(['Hammer'])
  })

  it('lets a product reappear once the gap exceeds the window', () => {
    const scenes = [
      baseScene(0, 0, [{ id: 'hammer-1', productKey: 'Hammer' }]),
      baseScene(1, 90, [{ id: 'hammer-2', productKey: 'Hammer' }]),
    ]
    // 90s gap > 60s window → second emission re-emerges
    const result = buildProductEntries(scenes, 60)
    expect(result.map((p) => p.productKey)).toEqual(['Hammer', 'Hammer'])
  })

  it('disables dedupe when window === 0', () => {
    const scenes = [
      baseScene(0, 0, [
        { id: 'h1', productKey: 'Hammer' },
        { id: 'h2', productKey: 'Hammer' },
      ]),
    ]
    const result = buildProductEntries(scenes, 0)
    expect(result).toHaveLength(2)
  })

  it('attaches scene anchor metadata (id/label/start) to every entry', () => {
    const scenes = [baseScene(5, 100, [{ id: 'p', productKey: 'P', name: 'Product P' }])]
    const result = buildProductEntries(scenes, 0)
    expect(result[0]).toMatchObject({
      sceneId: 'scene-5',
      sceneLabel: 'Scene 5',
      sceneStart: 100,
      productKey: 'P',
      name: 'Product P',
    })
  })
})

describe('splitProductEntriesAroundAdBreak (HANDOFF §6 segment isolation)', () => {
  const scenes = [
    baseScene(0, 0, [{ id: 'a', productKey: 'PreA' }]),
    baseScene(1, 50, [{ id: 'b', productKey: 'PreB' }]),
    baseScene(2, 110, [{ id: 'c', productKey: 'PostA' }]),
    baseScene(3, 160, [{ id: 'd', productKey: 'PostB' }]),
  ]

  it('returns all-in-pre / empty-post when hasAdBreak is false', () => {
    const result = splitProductEntriesAroundAdBreak(scenes, {
      hasAdBreak: false,
      boundarySeconds: 107,
      dedupeWindowSeconds: 0,
    })
    expect(result.preAdProductEntries.map((p) => p.productKey)).toEqual([
      'PreA',
      'PreB',
      'PostA',
      'PostB',
    ])
    expect(result.postAdProductEntries).toEqual([])
  })

  it('splits scenes at the boundary when hasAdBreak is true', () => {
    const result = splitProductEntriesAroundAdBreak(scenes, {
      hasAdBreak: true,
      boundarySeconds: 107,
      dedupeWindowSeconds: 0,
    })
    expect(result.preAdProductEntries.map((p) => p.productKey)).toEqual(['PreA', 'PreB'])
    expect(result.postAdProductEntries.map((p) => p.productKey)).toEqual(['PostA', 'PostB'])
  })

  it('boundary is half-open: scene.start === boundary lands in postAd', () => {
    const sceneAtBoundary = [
      baseScene(0, 0, [{ id: 'a', productKey: 'Pre' }]),
      baseScene(1, 107, [{ id: 'b', productKey: 'AtBoundary' }]),
    ]
    const result = splitProductEntriesAroundAdBreak(sceneAtBoundary, {
      hasAdBreak: true,
      boundarySeconds: 107,
      dedupeWindowSeconds: 0,
    })
    expect(result.preAdProductEntries.map((p) => p.productKey)).toEqual(['Pre'])
    expect(result.postAdProductEntries.map((p) => p.productKey)).toEqual(['AtBoundary'])
  })

  it('lets a product appear in BOTH segments (independent dedupe state per list)', () => {
    // The same product (keyed "Saw") legitimately appears in Segment A and
    // Segment B. With independent dedupe per segment, it should land in
    // each list once.
    const sawScenes = [
      baseScene(0, 10, [{ id: 's1', productKey: 'Saw' }]),
      baseScene(1, 120, [{ id: 's2', productKey: 'Saw' }]),
    ]
    const result = splitProductEntriesAroundAdBreak(sawScenes, {
      hasAdBreak: true,
      boundarySeconds: 107,
      dedupeWindowSeconds: 60,
    })
    expect(result.preAdProductEntries.map((p) => p.productKey)).toEqual(['Saw'])
    expect(result.postAdProductEntries.map((p) => p.productKey)).toEqual(['Saw'])
  })
})

describe('buildAllProductEntries', () => {
  it('builds a single list spanning every scene with the same dedupe', () => {
    const scenes = [
      baseScene(0, 0, [{ id: 'a', productKey: 'PreA' }]),
      baseScene(1, 110, [{ id: 'c', productKey: 'PostA' }]),
    ]
    const result = buildAllProductEntries(scenes, 0)
    expect(result.map((p) => p.productKey)).toEqual(['PreA', 'PostA'])
  })

  it('applies dedupe across the segment boundary (no per-segment isolation)', () => {
    // In the ALL list the same productKey across the boundary collapses
    // when the time gap < window. The split list keeps both — that's
    // the difference between the two helpers.
    const sawScenes = [
      baseScene(0, 100, [{ id: 's1', productKey: 'Saw' }]),
      baseScene(1, 120, [{ id: 's2', productKey: 'Saw' }]),
    ]
    const result = buildAllProductEntries(sawScenes, 60)
    expect(result.map((p) => p.productKey)).toEqual(['Saw'])
  })
})

describe('resolveActiveProductIndex', () => {
  const productEntries = [
    {
      id: 'p1',
      productKey: 'A',
      name: 'A',
      description: '',
      image: '',
      sceneId: 'scene-1',
      sceneLabel: 'Scene 1',
      sceneStart: 10,
    },
    {
      id: 'p2',
      productKey: 'B',
      name: 'B',
      description: '',
      image: '',
      sceneId: 'scene-3',
      sceneLabel: 'Scene 3',
      sceneStart: 30,
    },
    {
      id: 'p3',
      productKey: 'C',
      name: 'C',
      description: '',
      image: '',
      sceneId: 'scene-5',
      sceneLabel: 'Scene 5',
      sceneStart: 50,
    },
  ]

  it('returns -1 for empty productEntries', () => {
    expect(
      resolveActiveProductIndex([], {
        activeSceneIndex: 0,
        activeScene: baseScene(0, 0),
        panelTimelineSeconds: 0,
      })
    ).toBe(-1)
  })

  it('returns -1 when activeSceneIndex < 0 (pre-content stretch)', () => {
    expect(
      resolveActiveProductIndex(productEntries, {
        activeSceneIndex: -1,
        activeScene: null,
        panelTimelineSeconds: 5,
      })
    ).toBe(-1)
  })

  it('returns the index of the first product in the active scene when one exists', () => {
    expect(
      resolveActiveProductIndex(productEntries, {
        activeSceneIndex: 3,
        activeScene: baseScene(3, 30),
        panelTimelineSeconds: 30,
      })
    ).toBe(1) // scene-3 → index 1 in productEntries
  })

  it('falls back to most-recent-past product when active scene has no products', () => {
    const sceneWithoutProducts = baseScene(2, 20)
    // Active scene 2 is between scene-1 (10s, with product) and
    // scene-3 (30s, with product). The fallback should pick scene-1's
    // product since its sceneStart (10) <= panelTimelineSeconds (25).
    expect(
      resolveActiveProductIndex(productEntries, {
        activeSceneIndex: 2,
        activeScene: sceneWithoutProducts,
        panelTimelineSeconds: 25,
      })
    ).toBe(0)
  })

  it('returns -1 when active scene has no products AND no past product is reached yet', () => {
    const sceneAtZero = baseScene(0, 0)
    // panelTimelineSeconds = 5: before any product's sceneStart (10).
    expect(
      resolveActiveProductIndex(productEntries, {
        activeSceneIndex: 0,
        activeScene: sceneAtZero,
        panelTimelineSeconds: 5,
      })
    ).toBe(-1)
  })

  it('does not jump to scene[0] products when activeScene is null but activeSceneIndex is valid', () => {
    // The "don't use activeScene ?? playbackScenes[0] fallback" comment in
    // the hook calls this out specifically: passing null should make the
    // function fall back to the most-recent-past lookup, not Scene 0.
    expect(
      resolveActiveProductIndex(productEntries, {
        activeSceneIndex: 4,
        activeScene: null,
        panelTimelineSeconds: 60,
      })
    ).toBe(2) // most recent past = scene-5 (sceneStart 50 <= 60)
  })
})
