import type { SceneMetadata } from '../types'

/**
 * Build a fingerprint string from a scene's primary signals. Two scenes with
 * the same fingerprint are visually equivalent at a high level — same
 * dialogue context, same music emotion, same location, same objects-presence
 * — and the inline JSON panel collapses them into a single card to avoid
 * showing a flood of near-duplicate JSON blocks in the dense scene-cut
 * regions DHYH produces (1–3s scenes, often within the same beat).
 *
 * **The strongest "same beat" signal is `audio_transcript`.** The upstream
 * model emits the same rolling-window transcript across multiple cuts that
 * fall within the same dialogue beat, so transcript-equality is a much more
 * reliable beat-grouper than the noisier IAB / GARM classifications. We use
 * a short prefix + length as the transcript key to keep fingerprint strings
 * short.
 *
 * **Intentionally NOT part of the fingerprint:**
 *   - **IAB / GARM** — the model frequently hedges between cuts of the same
 *     beat (e.g. "Style & Fashion" → "Home Improvement" while the camera
 *     stays on the same powder-room reveal). Including them over-fragments.
 *   - **Sentiment** — varies subtly (Mostly Positive → Somewhat Positive)
 *     within the same beat as the host's reaction modulates.
 *
 * Returns null for scenes without rawJson — those don't get their own card
 * and shouldn't contribute to a group.
 */
export const sceneFingerprint = (scene: SceneMetadata): string | null => {
  const raw = scene.rawJson
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const transcript = typeof r.audio_transcript === 'string' ? r.audio_transcript : ''
  const transcriptKey = transcript
    ? transcript.slice(0, 80) + '|len' + transcript.length
    : ''
  const musicSrc = r.music_emotion
  const music = Array.isArray(musicSrc)
    ? (musicSrc[0] as { name?: string } | undefined)?.name ?? ''
    : (musicSrc as { name?: string } | undefined)?.name ?? ''
  const location = (r.locations as Array<{ name?: string }> | undefined)?.[0]?.name ?? ''
  // Sorted list of detected object names rather than just a "has-objects" bit:
  // two cuts in the same beat with the same set of detected objects merge,
  // but if the camera pans to a new shelf with a different decor item, that
  // scene gets its own card.
  const objectsKey = ((r.objects as Array<{ name?: string }> | undefined) ?? [])
    .map((o) => o.name ?? '')
    .filter(Boolean)
    .sort()
    .join(',')
  return `${transcriptKey}||${music}||${location}||${objectsKey}`
}

export type JsonSceneGroup = {
  /** Index in `playbackScenes` of the lead (representative) scene. */
  leadIndex: number
  /** Indices of every scene this group spans (always includes leadIndex). */
  sceneIndices: number[]
  /** The lead scene — its `rawJson` is what the card displays. */
  leadScene: SceneMetadata
  /** The last scene in the group (== leadScene if size 1). */
  endScene: SceneMetadata
  /** Display label, e.g. "Scene 5" or "Scenes 5–7". */
  label: string
  /** Group's start time (lead.start). */
  startSec: number
  /** Group's end time (last scene's end). */
  endSec: number
  /** Space-separated scene ids — used as the card's `data-scene-anchor` so
   *  the expanded dialog's `~=` selector resolves to this card regardless
   *  of which underlying scene happens to be the user's active scene. */
  anchorIds: string
}

/**
 * Collapse adjacent scenes with identical fingerprints into single groups for
 * the JSON panel. Only iterates scenes up to and including `activeSceneIndex`
 * (the panel only ever renders scenes the user has reached), and skips
 * empty/non-meaningful scenes.
 *
 * Each returned group is one rendered card; `sceneIndices` lets callers point
 * every underlying scene's ref at the group's box so the panel-scroll engine
 * resolves the active scene to its rendered card regardless of which specific
 * scene index is currently active inside the group.
 */
export const groupJsonScenes = (
  scenes: SceneMetadata[],
  activeSceneIndex: number
): JsonSceneGroup[] => {
  const groups: JsonSceneGroup[] = []
  let currentFp: string | null = null

  for (let i = 0; i < scenes.length; i++) {
    if (i > activeSceneIndex) break
    const scene = scenes[i]
    if (scene.isEmpty) {
      // Empty scenes don't render and break group adjacency — a group can't
      // span across a non-meaningful gap.
      currentFp = null
      continue
    }
    const fp = sceneFingerprint(scene)
    const last = groups[groups.length - 1]
    if (last && fp !== null && fp === currentFp) {
      last.sceneIndices.push(i)
      last.endScene = scene
      last.endSec = scene.end
      last.label = formatGroupLabel(last.leadScene, scene)
      last.anchorIds = last.sceneIndices.map((idx) => scenes[idx].id).join(' ')
    } else {
      groups.push({
        leadIndex: i,
        sceneIndices: [i],
        leadScene: scene,
        endScene: scene,
        label: scene.sceneLabel,
        startSec: scene.start,
        endSec: scene.end,
        anchorIds: scene.id,
      })
      currentFp = fp
    }
  }

  return groups
}

const formatGroupLabel = (lead: SceneMetadata, end: SceneMetadata): string => {
  if (lead === end) return lead.sceneLabel
  const m1 = lead.sceneLabel.match(/(\d+)\s*$/)
  const m2 = end.sceneLabel.match(/(\d+)\s*$/)
  if (m1 && m2) return `Scenes ${m1[1]}–${m2[1]}`
  return `${lead.sceneLabel} – ${end.sceneLabel}`
}
