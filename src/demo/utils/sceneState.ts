import type { SceneMetadata, TaxonomyOption } from '../types'

// Phase 6d — pure-function scene-state resolvers.
//
// `useDemoPlayback` historically computed the "current scene" and "what
// taxonomies are available" inline as memos. Extracting them as pure
// functions lets us pin their fall-back behavior (which has been the
// source of multiple bugs: panels jumping to Scene 1 in pre-content
// stretches, Location lighting up at Basic Scene because the editorial
// timeline retrofits a scene that has no upstream tag, etc.).

/**
 * Resolve the index of the currently-active scene given the panel's
 * clip-time. Three-tier lookup:
 *
 *   1. Fast path: time lies inside a scene window
 *      (`scene.start ≤ time < scene.end`).
 *   2. Before the first scene: returns `-1` so panels stay at the top
 *      (e.g. the DHYH color-bar intro).
 *   3. In a gap between scenes, or past the clip end: returns the
 *      last scene whose `start ≤ time`. Without this, the old
 *      fallback (`scenes.length - 1`) would snap panels to the very
 *      last scene any time the timeline landed in a gap, producing
 *      the "panel lurches to bottom and snaps back" misbehavior.
 *
 * Returns `-1` for empty `scenes`.
 */
export const resolveActiveSceneIndex = (
  scenes: readonly SceneMetadata[],
  panelTimelineSeconds: number
): number => {
  if (scenes.length === 0) return -1
  const foundIndex = scenes.findIndex(
    (scene) => panelTimelineSeconds >= scene.start && panelTimelineSeconds < scene.end
  )
  if (foundIndex >= 0) return foundIndex
  if (panelTimelineSeconds < scenes[0].start) return -1
  for (let i = scenes.length - 1; i >= 0; i--) {
    if (scenes[i].start <= panelTimelineSeconds) return i
  }
  return -1
}

/**
 * Resolve which taxonomies should be selectable given the active
 * tier + content. Three layers of gating, in order of precedence:
 *
 *   1. **Per-content hides**: `hiddenTaxonomies` from the active
 *      `ContentConfig`. Used to opt content out of taxonomies that
 *      conceptually exist at this tier but aren't curated for this
 *      title (e.g. DHYH hides Brand Safety because the upstream GARM
 *      data isn't approved for the demo).
 *   2. **Per-tier whitelist**: `tierWhitelist`. Source of truth for
 *      which taxonomies the upstream JSON conceptually owns at this
 *      tier — runs BEFORE the per-scene data-presence check so
 *      retrofits like the editorial DHYH location timeline can't
 *      sneak Location into Basic Scene (a real bug from before this
 *      gate existed).
 *   3. **Per-scene data presence**: only applies when
 *      `isContentDataDriven` is true (i.e. real DHYH content). The
 *      caller injects `hasDataForOption` because the actual data
 *      lookup (`getTaxonomySceneData`) lives in another module and
 *      we want this resolver to stay testable without that
 *      dependency. For non-data-driven content (placeholder), the
 *      whitelist alone determines availability.
 */
export const resolveTaxonomyAvailability = (
  options: {
    /** Per-content hides from `ContentConfig.hiddenTaxonomies`. */
    hiddenTaxonomies: readonly TaxonomyOption[]
    /** Per-tier whitelist (`TAXONOMIES_AVAILABLE_BY_TIER[tier]`). */
    tierWhitelist: readonly TaxonomyOption[]
    /** Iteration order for the result (`taxonomyOptions`). */
    allTaxonomies: readonly TaxonomyOption[]
    /** True for real DHYH-style content where per-scene data presence
     *  matters; false for placeholder content where the whitelist
     *  alone determines availability. */
    isContentDataDriven: boolean
    /** Injected predicate: does the current content actually emit
     *  data for this option across its scenes? Only consulted when
     *  `isContentDataDriven` is true. */
    hasDataForOption: (option: TaxonomyOption) => boolean
  }
): Record<TaxonomyOption, boolean> => {
  const availability: Record<TaxonomyOption, boolean> = {
    IAB: false,
    Location: false,
    Sentiment: false,
    'Brand Safety': false,
    Faces: false,
    Emotion: false,
    Object: false,
  }
  for (const option of options.allTaxonomies) {
    if (options.hiddenTaxonomies.includes(option)) continue
    if (!options.tierWhitelist.includes(option)) continue
    if (!options.isContentDataDriven) {
      availability[option] = true
      continue
    }
    availability[option] = options.hasDataForOption(option)
  }
  return availability
}
