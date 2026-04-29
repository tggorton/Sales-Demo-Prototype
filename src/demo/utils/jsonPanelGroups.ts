import type { SceneMetadata } from '../types'

/**
 * Groups adjacent scenes that belong to the same dialogue / camera beat into
 * single JSON-panel cards. The DHYH model emits scene-level signals (location,
 * objects, transcript) sparsely — within a single beat, those fields flicker
 * on and off as the model decides whether to commit to a label on a given
 * frame. A naive "fingerprint" hash splits the panel at every flicker, which
 * the user perceives as the panel "showing the same thing over and over."
 *
 * This algorithm uses **iterative sticky merging** instead:
 *
 *   - Adjacent scenes extend the current group as long as they don't actively
 *     contradict it. "Empty" values match anything and inherit the group's
 *     established value (the first non-empty value any scene in the group
 *     contributed).
 *   - A scene actively contradicts the group only when it has an explicit
 *     value that differs from the group's established explicit value:
 *       • music_emotion changes
 *       • transcript prefix changes (the rolling window emits the same dialogue
 *         across all cuts in a beat, so prefix-equality is a strong signal)
 *       • location changes
 *       • objects change
 *   - Time gaps > MAX_GROUP_GAP_SECONDS also force a split — a long stretch
 *     of empty/non-meaningful scenes between two beats means we don't bridge
 *     them.
 *
 * Sentiment, IAB, GARM are intentionally NOT considered. The model hedges
 * on those between cuts of the same beat (e.g. Style & Fashion ↔ Home
 * Improvement during the powder-room reveal); including them over-fragments.
 *
 * The merged card's displayed JSON is taken from the first scene in the
 * group with a non-empty audio_transcript (the "content lead") rather than
 * the chronological first scene — this avoids the awkward case where a beat
 * starts with a couple empty-transcript scenes and the rendered JSON would
 * otherwise look empty even though the rest of the group has rich data.
 */

const MAX_GROUP_GAP_SECONDS = 15
const TRANSCRIPT_PREFIX_LENGTH = 40

// ---- Field accessors ---------------------------------------------------------

const transcriptOf = (scene: SceneMetadata): string => {
  const raw = scene.rawJson
  if (!raw || typeof raw !== 'object') return ''
  const t = (raw as Record<string, unknown>).audio_transcript
  return typeof t === 'string' ? t : ''
}

const transcriptKeyOf = (scene: SceneMetadata): string =>
  transcriptOf(scene).slice(0, TRANSCRIPT_PREFIX_LENGTH)

const musicOf = (scene: SceneMetadata): string => {
  const raw = scene.rawJson
  if (!raw || typeof raw !== 'object') return ''
  const m = (raw as Record<string, unknown>).music_emotion
  if (Array.isArray(m)) return (m[0] as { name?: string } | undefined)?.name ?? ''
  return (m as { name?: string } | undefined)?.name ?? ''
}

const locationOf = (scene: SceneMetadata): string => {
  const raw = scene.rawJson
  if (!raw || typeof raw !== 'object') return ''
  return (
    (raw as Record<string, unknown>).locations as Array<{ name?: string }> | undefined
  )?.[0]?.name ?? ''
}

const objectsKeyOf = (scene: SceneMetadata): string => {
  const raw = scene.rawJson
  if (!raw || typeof raw !== 'object') return ''
  const objs =
    ((raw as Record<string, unknown>).objects as Array<{ name?: string }> | undefined) ?? []
  return objs
    .map((o) => o.name ?? '')
    .filter(Boolean)
    .sort()
    .join(',')
}

// ---- Group builder ----------------------------------------------------------

type GroupBuilder = {
  sceneIndices: number[]
  startSec: number
  endSec: number
  music: string
  // Sticky values: first non-empty value any scene in the group contributed.
  transcriptKey: string
  location: string
  objects: string
}

const canExtendGroup = (
  group: GroupBuilder,
  scene: SceneMetadata,
  prevScene: SceneMetadata
): boolean => {
  // Music change ends the beat unconditionally.
  if (musicOf(scene) !== group.music) return false
  // Long gap of non-meaningful scenes between beats — split.
  if (scene.start - prevScene.end > MAX_GROUP_GAP_SECONDS) return false

  // Transcript and location are strict: explicit non-empty values that differ
  // signal a different beat. Empty inherits (sticky).
  const sceneTranscript = transcriptKeyOf(scene)
  if (sceneTranscript && group.transcriptKey && sceneTranscript !== group.transcriptKey) return false

  const sceneLocation = locationOf(scene)
  if (sceneLocation && group.location && sceneLocation !== group.location) return false

  // Objects are strict: differing non-empty object sets signal that the
  // camera has moved to something new. We considered relaxing this within
  // an established location (Mirror+Sink → Bathtub+Toilet camera-pan in the
  // same bathroom would merge), but in DHYH every object on screen carries a
  // product_match — different objects = different products to surface. Hiding
  // those by merging into a representative-lead card defeats the demo's
  // shopping point. The bathroom still ends up as ~4 cards instead of ~12,
  // each card displaying distinct product data.
  const sceneObjects = objectsKeyOf(scene)
  if (sceneObjects && group.objects && sceneObjects !== group.objects) return false

  return true
}

const extendGroup = (group: GroupBuilder, scene: SceneMetadata, index: number): void => {
  group.sceneIndices.push(index)
  group.endSec = scene.end
  // Establish sticky values the first time a non-empty one appears.
  if (!group.transcriptKey) group.transcriptKey = transcriptKeyOf(scene)
  if (!group.location) group.location = locationOf(scene)
  if (!group.objects) group.objects = objectsKeyOf(scene)
}

const startGroup = (scene: SceneMetadata, index: number): GroupBuilder => ({
  sceneIndices: [index],
  startSec: scene.start,
  endSec: scene.end,
  music: musicOf(scene),
  transcriptKey: transcriptKeyOf(scene),
  location: locationOf(scene),
  objects: objectsKeyOf(scene),
})

// ---- Public output type -----------------------------------------------------

export type JsonSceneGroup = {
  /** Index of the scene whose JSON the merged card displays. Picked
   *  dynamically as the first scene in the group with a non-empty
   *  audio_transcript (falls back to the chronological first scene if every
   *  member has an empty transcript). */
  leadIndex: number
  /** Indices of every scene this group spans (always includes leadIndex). */
  sceneIndices: number[]
  /** Lead scene whose `rawJson` populates the card. */
  leadScene: SceneMetadata
  /** Last scene chronologically (for the timestamp range). */
  endScene: SceneMetadata
  /** Display label, e.g. "Scene 5" or "Scenes 5–7". */
  label: string
  /** Group's start time (chronological first scene's start). */
  startSec: number
  /** Group's end time (chronological last scene's end). */
  endSec: number
  /** Space-separated scene ids — for the expanded dialog's anchor lookup
   *  (kept on the group output even though the dialog itself currently uses
   *  ungrouped per-scene anchors; here for symmetry with the inline panel). */
  anchorIds: string
}

const pickContentLead = (
  scenes: SceneMetadata[],
  indices: number[]
): { leadIndex: number; leadScene: SceneMetadata } => {
  for (const idx of indices) {
    if (transcriptOf(scenes[idx])) {
      return { leadIndex: idx, leadScene: scenes[idx] }
    }
  }
  return { leadIndex: indices[0], leadScene: scenes[indices[0]] }
}

const formatGroupLabel = (firstScene: SceneMetadata, lastScene: SceneMetadata): string => {
  if (firstScene === lastScene) return firstScene.sceneLabel
  const m1 = firstScene.sceneLabel.match(/(\d+)\s*$/)
  const m2 = lastScene.sceneLabel.match(/(\d+)\s*$/)
  if (m1 && m2) return `Scenes ${m1[1]}–${m2[1]}`
  return `${firstScene.sceneLabel} – ${lastScene.sceneLabel}`
}

// ---- Public API -------------------------------------------------------------

/**
 * Iteratively group adjacent scenes (up to and including `activeSceneIndex`,
 * skipping `isEmpty` scenes which break adjacency) into beats. See the file
 * header for the merging rules.
 */
export const groupJsonScenes = (
  scenes: SceneMetadata[],
  activeSceneIndex: number
): JsonSceneGroup[] => {
  const builders: GroupBuilder[] = []
  let prevScene: SceneMetadata | null = null

  for (let i = 0; i < scenes.length; i++) {
    if (i > activeSceneIndex) break
    const scene = scenes[i]
    if (scene.isEmpty) {
      // Non-meaningful scenes break group adjacency — a beat can't span across
      // a stretch of color-bars / black frames / etc.
      prevScene = null
      continue
    }
    const lastBuilder = builders[builders.length - 1]
    if (lastBuilder && prevScene && canExtendGroup(lastBuilder, scene, prevScene)) {
      extendGroup(lastBuilder, scene, i)
    } else {
      builders.push(startGroup(scene, i))
    }
    prevScene = scene
  }

  return builders.map((b): JsonSceneGroup => {
    const firstScene = scenes[b.sceneIndices[0]]
    const lastScene = scenes[b.sceneIndices[b.sceneIndices.length - 1]]
    const { leadIndex, leadScene } = pickContentLead(scenes, b.sceneIndices)
    return {
      leadIndex,
      sceneIndices: b.sceneIndices,
      leadScene,
      endScene: lastScene,
      label: formatGroupLabel(firstScene, lastScene),
      startSec: b.startSec,
      endSec: b.endSec,
      anchorIds: b.sceneIndices.map((i) => scenes[i].id).join(' '),
    }
  })
}

// `sceneFingerprint` is no longer used internally but kept exported in case
// other consumers want a quick equality check against the same signal set.
// It uses the same field accessors so behavior matches the iterative grouper's
// "same beat" intuition for a single-scene equality check.
export const sceneFingerprint = (scene: SceneMetadata): string | null => {
  if (!scene.rawJson) return null
  return [
    transcriptKeyOf(scene),
    musicOf(scene),
    locationOf(scene),
    objectsKeyOf(scene),
  ].join('||')
}
