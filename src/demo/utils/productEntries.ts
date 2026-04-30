import type { ProductEntry, SceneMetadata } from '../types'

// Phase 6c — pure-function product-entry building.
//
// HANDOFF §6 (protected behavior): DHYH in Sync: Impulse mode plays
// two stitched content segments (Segment A pre-ad and Segment B
// post-ad) with an ad break between them. The Products panel must
// only surface products from the segment the viewer is currently in —
// otherwise post-ad items leak into the tail of the pre-ad viewport
// and vice versa, and a scrub across the ad boundary leaves the panel
// parked on the wrong segment's products.
//
// We build TWO independent lists per the splice (each with its own
// time-windowed dedupe so a product appearing in both segments shows
// up once per segment), plus one combined list for the expanded
// dialog (which shows everything regardless of segment).
//
// Time-windowed dedupe: within a list, if a product already emitted
// within the last `dedupeWindowSeconds` (on the playback timeline),
// skip subsequent occurrences. A gap larger than the window lets the
// product reappear so recurring on-screen items still show up
// naturally later in the clip. Set `dedupeWindowSeconds` to 0 to
// disable.

/**
 * Build a flat list of product entries from a sequence of scenes,
 * applying time-windowed dedupe by `productKey`. The first emission
 * of each `productKey` always lands in the result; subsequent
 * emissions are dropped if they fall within `dedupeWindowSeconds` of
 * the previous emission. This is the inner builder shared by
 * `splitProductEntriesAroundAdBreak` and `buildAllProductEntries`.
 */
export const buildProductEntries = (
  scenes: readonly SceneMetadata[],
  dedupeWindowSeconds: number
): ProductEntry[] => {
  const result: ProductEntry[] = []
  const lastEmittedAt = new Map<string, number>()
  for (const scene of scenes) {
    for (const product of scene.products) {
      const previous = lastEmittedAt.get(product.productKey)
      if (
        dedupeWindowSeconds > 0 &&
        previous !== undefined &&
        scene.start - previous < dedupeWindowSeconds
      ) {
        continue
      }
      result.push({
        ...product,
        sceneId: scene.id,
        sceneLabel: scene.sceneLabel,
        sceneStart: scene.start,
      })
      lastEmittedAt.set(product.productKey, scene.start)
    }
  }
  return result
}

/**
 * For DHYH-with-ad-break, split scenes into Segment A (`scene.start <
 * boundary`) and Segment B (`scene.start >= boundary`) and build each
 * list independently so a product appearing in both segments gets to
 * show up once per segment. For non-ad-break content, all scenes go
 * into `preAdProductEntries` and `postAdProductEntries` is empty.
 *
 * The `boundary` is `DHYH_AD_BREAK_CLIP_SECONDS` (= end of Segment A,
 * start of Segment B). Caller passes it in to keep the function
 * generic and content-agnostic.
 */
export const splitProductEntriesAroundAdBreak = (
  scenes: readonly SceneMetadata[],
  options: {
    hasAdBreak: boolean
    boundarySeconds: number
    dedupeWindowSeconds: number
  }
): { preAdProductEntries: ProductEntry[]; postAdProductEntries: ProductEntry[] } => {
  if (!options.hasAdBreak) {
    return {
      preAdProductEntries: buildProductEntries(scenes, options.dedupeWindowSeconds),
      postAdProductEntries: [],
    }
  }
  const preAdScenes = scenes.filter((scene) => scene.start < options.boundarySeconds)
  const postAdScenes = scenes.filter((scene) => scene.start >= options.boundarySeconds)
  return {
    preAdProductEntries: buildProductEntries(preAdScenes, options.dedupeWindowSeconds),
    postAdProductEntries: buildProductEntries(postAdScenes, options.dedupeWindowSeconds),
  }
}

/**
 * Build a single list spanning every scene with the same dedupe
 * window. Used by the expanded Products dialog, which shows every
 * product regardless of which segment the viewer is in — dedupe is
 * still applied once across the whole clip so recurring items don't
 * pile up.
 */
export const buildAllProductEntries = (
  scenes: readonly SceneMetadata[],
  dedupeWindowSeconds: number
): ProductEntry[] => buildProductEntries(scenes, dedupeWindowSeconds)

/**
 * Resolve which product index in `productEntries` is "current" given
 * the active scene + clip-time. Two-tier lookup:
 *
 *   1. If the active scene has a product in the list, that's the
 *      current index. Lands the panel on the first product of the
 *      active scene when one exists.
 *   2. Otherwise (active scene is between products, or has none),
 *      fall back to the most recent past product whose `sceneStart`
 *      is at or before the current panel-time. This keeps the panel
 *      anchored to the last visible product instead of jumping back
 *      to the top during a product-less stretch.
 *
 * Returns `-1` for empty lists, fully pre-product timelines (e.g.
 * the DHYH color-bar intro), or invalid `activeSceneIndex`.
 */
export const resolveActiveProductIndex = (
  productEntries: readonly ProductEntry[],
  options: {
    activeSceneIndex: number
    activeScene: SceneMetadata | null
    panelTimelineSeconds: number
  }
): number => {
  if (productEntries.length === 0) return -1
  if (options.activeSceneIndex < 0) return -1
  if (options.activeScene) {
    const firstMatch = productEntries.findIndex(
      (entry) => entry.sceneId === options.activeScene!.id
    )
    if (firstMatch >= 0) return firstMatch
  }
  for (let i = productEntries.length - 1; i >= 0; i--) {
    if (productEntries[i].sceneStart <= options.panelTimelineSeconds) return i
  }
  return -1
}
