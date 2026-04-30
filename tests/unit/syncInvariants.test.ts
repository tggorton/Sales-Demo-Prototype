import { describe, expect, it } from 'vitest'
import { resolveActiveProductIndex } from '../../src/demo/utils/productEntries'
import { resolveActiveSceneIndex } from '../../src/demo/utils/sceneState'
import type { ProductEntry, SceneMetadata } from '../../src/demo/types'

// Phase 9c — composition invariants for panel sync.
//
// The collapsed and expanded panels MUST agree on which scene + product
// is "current" for any given panel-time, otherwise opening the
// expanded view lands somewhere different than the inline view was
// showing. Earlier code violated this in two ways:
//
//   1. The expanded dialog computed its own product target using
//      `videoCurrentSeconds` (player-time, post-ad-break offset)
//      while the inline panel used `panelTimelineSeconds` (clip-time).
//      → fixed in Phase 9a by routing both through `resolveActiveProductIndex`.
//   2. The expanded dialog read from `allProductEntries` (cross-segment
//      single dedupe) while the inline panel read from `productEntries`
//      (per-segment independent dedupe). The arrays had different
//      indices for the same product. → fixed in Phase 9a by passing
//      the same `productEntries` to both.
//
// These tests pin the composition: given the same `(scenes,
// panelTimelineSeconds, productEntries)`, the two resolvers cannot
// disagree about which scene the active product belongs to.

const sceneAt = (
  id: number,
  start: number,
  end: number,
  products: Array<{ id: string; productKey: string }> = []
): SceneMetadata => ({
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
  products: products.map((p) => ({
    id: p.id,
    productKey: p.productKey,
    name: p.productKey,
    description: '',
    image: '',
  })),
})

const productEntryFromScene = (scene: SceneMetadata): ProductEntry[] =>
  scene.products.map((product) => ({
    ...product,
    sceneId: scene.id,
    sceneLabel: scene.sceneLabel,
    sceneStart: scene.start,
  }))

describe('Cross-resolver sync invariants (Phase 9c)', () => {
  // A DHYH-like timeline: 5 scenes, some with products, some without.
  // Mirrors the real shape that exposed earlier bugs.
  const scenes: SceneMetadata[] = [
    sceneAt(0, 0, 30, [{ id: 'p0a', productKey: 'A' }]),
    sceneAt(1, 30, 60, []), // gap scene with no products
    sceneAt(2, 60, 90, [
      { id: 'p2a', productKey: 'B' },
      { id: 'p2b', productKey: 'C' },
    ]),
    sceneAt(3, 90, 120, []),
    sceneAt(4, 120, 150, [{ id: 'p4a', productKey: 'D' }]),
  ]
  const productEntries: ProductEntry[] = scenes.flatMap(productEntryFromScene)

  it('when a scene has products, activeProductIndex points at one IN that scene', () => {
    // Time 15 → scene 0 (which has product A). activeProductIndex
    // should point at p0a, whose sceneId === scene-0.
    const sceneIdx = resolveActiveSceneIndex(scenes, 15)
    const productIdx = resolveActiveProductIndex(productEntries, {
      activeSceneIndex: sceneIdx,
      activeScene: scenes[sceneIdx],
      panelTimelineSeconds: 15,
    })
    expect(sceneIdx).toBe(0)
    expect(productIdx).toBeGreaterThanOrEqual(0)
    expect(productEntries[productIdx].sceneId).toBe(scenes[sceneIdx].id)
  })

  it('multi-product scenes — activeProductIndex points at the FIRST product of that scene', () => {
    // Time 75 → scene 2 (has products B and C). activeProductIndex
    // should point at the first one (B), not the last.
    const sceneIdx = resolveActiveSceneIndex(scenes, 75)
    const productIdx = resolveActiveProductIndex(productEntries, {
      activeSceneIndex: sceneIdx,
      activeScene: scenes[sceneIdx],
      panelTimelineSeconds: 75,
    })
    expect(sceneIdx).toBe(2)
    expect(productEntries[productIdx].productKey).toBe('B')
    expect(productEntries[productIdx].sceneId).toBe('scene-2')
  })

  it('product-less scenes — activeProductIndex falls back to the most-recent-past product', () => {
    // Time 45 → scene 1 (no products). Fallback should land on the
    // most recent past product (p0a from scene 0).
    const sceneIdx = resolveActiveSceneIndex(scenes, 45)
    const productIdx = resolveActiveProductIndex(productEntries, {
      activeSceneIndex: sceneIdx,
      activeScene: scenes[sceneIdx],
      panelTimelineSeconds: 45,
    })
    expect(sceneIdx).toBe(1)
    expect(productIdx).toBe(0)
    expect(productEntries[productIdx].productKey).toBe('A')
  })

  it('pre-content stretch — both resolvers refuse to commit', () => {
    // Time 0 — scene 0 starts AT 0 so we're inside scene 0, not pre-clip.
    // For a true pre-clip example, the first scene would need to start
    // later (covered by the dhyhTimeline test). For this fixture, time
    // before scenes[0].start is impossible.
    // Use scenes that don't start at 0 for the pre-content scenario:
    const lateScenes = [sceneAt(0, 100, 110, [{ id: 'late', productKey: 'L' }])]
    const lateEntries: ProductEntry[] = productEntryFromScene(lateScenes[0])
    const sceneIdx = resolveActiveSceneIndex(lateScenes, 50)
    const productIdx = resolveActiveProductIndex(lateEntries, {
      activeSceneIndex: sceneIdx,
      activeScene: null,
      panelTimelineSeconds: 50,
    })
    expect(sceneIdx).toBe(-1)
    expect(productIdx).toBe(-1)
  })

  it('past-end stretch — both resolvers stick at the last available scene/product', () => {
    // Time 1000 — past every scene. Scene resolver returns last scene
    // index, product resolver returns last product index reachable
    // (via the most-recent-past fallback).
    const sceneIdx = resolveActiveSceneIndex(scenes, 1000)
    const productIdx = resolveActiveProductIndex(productEntries, {
      activeSceneIndex: sceneIdx,
      activeScene: scenes[sceneIdx],
      panelTimelineSeconds: 1000,
    })
    expect(sceneIdx).toBe(scenes.length - 1)
    // scene 4 has product D → productIdx should point at D
    expect(productEntries[productIdx].productKey).toBe('D')
  })

  it('coherence sweep: across 100 sample times, every (scene, product) pair is consistent', () => {
    // Sweep the timeline at 1.5s intervals. For every sample, the
    // resolved active product (when one exists) must either:
    //   - belong to the active scene, OR
    //   - be a past product whose sceneStart <= time (the fallback).
    // It must NEVER point at a future product.
    for (let t = 0; t < 150; t += 1.5) {
      const sceneIdx = resolveActiveSceneIndex(scenes, t)
      const productIdx = resolveActiveProductIndex(productEntries, {
        activeSceneIndex: sceneIdx,
        activeScene: sceneIdx >= 0 ? scenes[sceneIdx] : null,
        panelTimelineSeconds: t,
      })
      if (productIdx < 0) continue
      const product = productEntries[productIdx]
      // Invariant: product is either in the active scene, or its
      // sceneStart precedes the current time (fallback).
      const inActiveScene = sceneIdx >= 0 && product.sceneId === scenes[sceneIdx].id
      const isPastProduct = product.sceneStart <= t
      expect(inActiveScene || isPastProduct).toBe(true)
      // Never point at a product whose scene starts in the future.
      expect(product.sceneStart).toBeLessThanOrEqual(
        Math.max(t, scenes[scenes.length - 1].start)
      )
    }
  })
})

describe('Segment-isolation invariant (HANDOFF §6 + Phase 9a)', () => {
  // The expanded panel now reads from the SAME segment-isolated list
  // the inline panel uses. Pin that the index passed in matches the
  // entry pulled out — no off-by-one between collapsed and expanded.
  const segmentScenes: SceneMetadata[] = [
    sceneAt(0, 0, 30, [{ id: 'pre0', productKey: 'PreA' }]),
    sceneAt(1, 50, 80, [{ id: 'pre1', productKey: 'PreB' }]),
    sceneAt(2, 110, 140, [{ id: 'post0', productKey: 'PostA' }]),
    sceneAt(3, 160, 190, [{ id: 'post1', productKey: 'PostB' }]),
  ]

  // Imagine these are the per-segment isolated entries (split at
  // boundary 100). preAd has [PreA, PreB], postAd has [PostA, PostB].
  // The inline panel during Segment B and the expanded panel during
  // Segment B BOTH render postAd.
  const postAdEntries: ProductEntry[] = [
    ...productEntryFromScene(segmentScenes[2]),
    ...productEntryFromScene(segmentScenes[3]),
  ]

  it('within Segment B, resolved index is into the postAd list (not the global)', () => {
    // Time 125 → scene 2 (PostA). activeProductIndex against postAd
    // entries should be 0 (PostA is at index 0 in postAd, even though
    // it would be at index 2 in a hypothetical "all entries" list).
    const sceneIdx = resolveActiveSceneIndex(segmentScenes, 125)
    const productIdx = resolveActiveProductIndex(postAdEntries, {
      activeSceneIndex: sceneIdx,
      activeScene: segmentScenes[sceneIdx],
      panelTimelineSeconds: 125,
    })
    expect(sceneIdx).toBe(2)
    expect(productIdx).toBe(0)
    expect(postAdEntries[productIdx].productKey).toBe('PostA')
  })

  it('the same product index resolves to the same product whether collapsed or expanded passes the list', () => {
    // The whole point of using segment-isolated entries on both
    // sides: indexing is identical. If both panels see the same
    // postAdEntries array, postAdEntries[0] is the same product on
    // both views by construction.
    const collapsedView = postAdEntries
    const expandedView = postAdEntries // same array now
    const productIdx = resolveActiveProductIndex(collapsedView, {
      activeSceneIndex: 3,
      activeScene: segmentScenes[3],
      panelTimelineSeconds: 175,
    })
    expect(collapsedView[productIdx]).toBe(expandedView[productIdx])
    expect(collapsedView[productIdx].productKey).toBe('PostB')
  })
})
