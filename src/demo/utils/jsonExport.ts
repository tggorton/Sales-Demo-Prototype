import type {
  AdDecisioningTailItem,
  AdPlaybackOption,
  JsonDownloadOption,
  SceneMetadata,
  TierOption,
} from '../types'
import { groupJsonScenes } from './jsonPanelGroups'

export const buildSceneJsonPayload = (scene: SceneMetadata, index: number) => {
  if (scene.rawJson !== undefined) {
    return scene.rawJson
  }
  return {
    video_id: 'cabbcae2-d527-406c-abbd-a5cc0269bbab',
    ext_id: `scene-${index + 1}`,
    duration_in_seconds: scene.end - scene.start,
    aspect_ratio: '16:9',
    video_metadata: {
      scene: scene.sceneLabel,
      sentiment_analysis: [
        {
          name: scene.emotion,
          count: Math.round(scene.emotionScore * 250),
          screen_time: scene.end - scene.start,
        },
      ],
      text_data: scene.textData,
      considered: scene.considered,
    },
  }
}

export const buildAdBreakJsonString = (
  activeAdBreakLabel: string,
  adDecisionPayload: Record<string, unknown>,
  adDecisioningTail: AdDecisioningTailItem[]
) => `{
  "${activeAdBreakLabel}"
}

${JSON.stringify(adDecisionPayload, null, 2)}

            "id": "${adDecisioningTail[0].id}",
            "name": "${adDecisioningTail[0].name}",
            "confidence": ${adDecisioningTail[0].confidence},
            "count": ${adDecisioningTail[0].count},
            "screen_time": ${adDecisioningTail[0].screen_time}
        },
        {
            "id": "${adDecisioningTail[1].id}",
            "name": "${adDecisioningTail[1].name}",
            "confidence": ${adDecisioningTail[1].confidence},
            "count": ${adDecisioningTail[1].count},
            "screen_time": ${adDecisioningTail[1].screen_time}
        },`

export const buildOriginalJsonString = ({
  isSyncImpulseMode,
  isAdBreakPlayback,
  activeAdBreakLabel,
  adDecisionPayload,
  adDecisioningTail,
  playbackScenes,
}: {
  isSyncImpulseMode: boolean
  isAdBreakPlayback: boolean
  activeAdBreakLabel: string
  adDecisionPayload: Record<string, unknown>
  adDecisioningTail: AdDecisioningTailItem[]
  playbackScenes: SceneMetadata[]
}) => {
  if (isSyncImpulseMode && isAdBreakPlayback) {
    return buildAdBreakJsonString(activeAdBreakLabel, adDecisionPayload, adDecisioningTail)
  }

  return JSON.stringify(playbackScenes.map(buildSceneJsonPayload), null, 2)
}

// ---- Summary JSON ----------------------------------------------------------
//
// "Summary JSON" = condensed, higher-level abstraction of the per-scene
// detail JSON. The shape is deliberately compact — designed for
// indexing / cataloging / quick review rather than granular analysis.
// Typical output for a 10-min DHYH episode lands in the 5–15 KB range
// vs. the ~1 MB+ original; ~50–100× smaller.
//
// Trimming choices:
//   - Per-scene digest replaced with **beats** (adjacent same-beat
//     scenes merged via the existing `groupJsonScenes` algorithm —
//     same chunking the JSON panel uses). For DHYH this collapses
//     ~175 scenes to ~25–35 beats.
//   - Rollups carry just `{name, share}` per item. The `weight` and
//     `appearances` fields the panel would use internally are derived
//     and consumers can recompute if needed.
//   - Empty rollup categories are omitted entirely (e.g. `emotion`
//     for DHYH — it uses `sentiment_analysis` instead).
//   - `brand_safety` collapses to `{ verdict }` when there's no signal.
//   - Redundant fields dropped: `start_timestamp` strings (compute
//     from seconds), `duration_seconds` per scene (compute from
//     start/end), `meaningful_scene_count` (== `beat_count` upstream).
//
// Everything is derived at runtime from `playbackScenes` — the same
// data that drives the panels — so the summary stays consistent with
// what the demo is showing. The DHYH `rawJson` per scene is preferred
// when present (real upstream signal); the fallback path uses the
// SceneMetadata fields the placeholder content provides.

type RawJsonNamed = { name?: string; confidence?: number; id?: string }
type RawJsonObject = {
  name?: string
  confidence?: number
  product_match?: Array<{ name?: string }>
}
type RawJsonShape = {
  audio_transcript?: string
  iab_taxonomy?: RawJsonNamed[]
  sentiment_analysis?: RawJsonNamed | RawJsonNamed[]
  music_emotion?: RawJsonNamed | RawJsonNamed[]
  locations?: RawJsonNamed[]
  objects?: RawJsonObject[]
  garm_category?: RawJsonNamed[]
}

const rawJsonOf = (scene: SceneMetadata): RawJsonShape | null => {
  const raw = scene.rawJson
  if (!raw || typeof raw !== 'object') return null
  return raw as RawJsonShape
}

const firstName = (value: RawJsonNamed | RawJsonNamed[] | undefined): string | null => {
  if (!value) return null
  const item = Array.isArray(value) ? value[0] : value
  return item?.name?.trim() || null
}

const round = (value: number, decimals = 3): number => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

type WeightedTally = Map<string, number>

const tallyAdd = (tally: WeightedTally, name: string, weight: number): void => {
  if (!name) return
  tally.set(name, (tally.get(name) ?? 0) + weight)
}

type RollupEntry = { name: string; share: number }

/** Top-N rollup: `{name, share}` per item, sorted desc by share. The
 *  caller is responsible for picking a sensible total (usually the
 *  show's total scene-seconds). Rollups are omitted entirely from the
 *  final summary when the underlying tally is empty. */
const tallyTop = (tally: WeightedTally, topN: number, totalWeight: number): RollupEntry[] => {
  const totals = totalWeight > 0 ? totalWeight : 1
  return Array.from(tally, ([name, weight]) => ({
    name,
    share: round(weight / totals, 4),
  }))
    .sort((a, b) => b.share - a.share)
    .slice(0, topN)
}

const sceneSeconds = (scene: SceneMetadata): number =>
  Math.max(0, scene.end - scene.start)

const oneLineHeadline = (scene: SceneMetadata): string => {
  const raw = rawJsonOf(scene)
  if (raw?.audio_transcript) {
    const trimmed = raw.audio_transcript.trim().replace(/\s+/g, ' ')
    return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed
  }
  if (scene.reasoning) return scene.reasoning
  if (scene.considered) return `Considered: ${scene.considered}`
  return scene.sceneLabel
}

/** Compact tags for a beat (max 3): primary IAB, primary location,
 *  primary sentiment. Skips empties; no `Key: Value` prefix since the
 *  consumer can disambiguate from order. */
const compactTagsForScene = (scene: SceneMetadata): string[] => {
  const tags: string[] = []
  const raw = rawJsonOf(scene)
  if (raw) {
    const iab = firstName(raw.iab_taxonomy)
    if (iab) tags.push(iab)
    const location = firstName(raw.locations)
    if (location) tags.push(location)
    const sentiment = firstName(raw.sentiment_analysis)
    if (sentiment) tags.push(sentiment)
  } else {
    if (scene.emotion) tags.push(scene.emotion)
    if (scene.musicEmotion) tags.push(scene.musicEmotion)
  }
  return tags
}

export const buildSummaryJsonString = ({
  playbackScenes,
  selectedTier,
  selectedAdPlayback,
  playbackDurationSeconds,
  contentTitle,
  contentId,
}: {
  playbackScenes: SceneMetadata[]
  selectedTier: TierOption
  selectedAdPlayback: AdPlaybackOption
  playbackDurationSeconds: number
  contentTitle: string
  contentId: string
}): string => {
  const meaningfulScenes = playbackScenes.filter((scene) => !scene.isEmpty)

  // ---- Tallies (weighted by per-scene screen time) -----------------------
  const iabTally: WeightedTally = new Map()
  const locationTally: WeightedTally = new Map()
  const objectTally: WeightedTally = new Map()
  const emotionTally: WeightedTally = new Map()
  const sentimentTally: WeightedTally = new Map()
  const musicEmotionTally: WeightedTally = new Map()
  const productTally: WeightedTally = new Map()
  const garmTally: WeightedTally = new Map()

  let totalSceneSeconds = 0
  let totalProductMatches = 0
  let totalObjectsDetected = 0

  for (const scene of meaningfulScenes) {
    const seconds = sceneSeconds(scene)
    totalSceneSeconds += seconds

    const raw = rawJsonOf(scene)
    if (raw) {
      for (const entry of raw.iab_taxonomy ?? []) {
        if (!entry?.name) continue
        const conf = typeof entry.confidence === 'number' ? entry.confidence : 1
        tallyAdd(iabTally, entry.name, seconds * conf)
      }
      for (const entry of raw.locations ?? []) {
        if (!entry?.name) continue
        const conf = typeof entry.confidence === 'number' ? entry.confidence : 1
        tallyAdd(locationTally, entry.name, seconds * conf)
      }
      for (const obj of raw.objects ?? []) {
        if (!obj?.name) continue
        const conf = typeof obj.confidence === 'number' ? obj.confidence : 1
        tallyAdd(objectTally, obj.name, seconds * conf)
        totalObjectsDetected += 1
        for (const match of obj.product_match ?? []) {
          if (!match?.name) continue
          tallyAdd(productTally, match.name, seconds)
          totalProductMatches += 1
        }
      }
      const sentiment = firstName(raw.sentiment_analysis)
      if (sentiment) tallyAdd(sentimentTally, sentiment, seconds)
      const music = firstName(raw.music_emotion)
      if (music) tallyAdd(musicEmotionTally, music, seconds)
      // GARM is hidden in the DHYH UI per ContentConfig.hiddenTaxonomies,
      // but the summary still surfaces it for downstream consumers when
      // the source content emits it.
      for (const entry of raw.garm_category ?? []) {
        if (!entry?.name) continue
        tallyAdd(garmTally, entry.name, seconds)
      }
    } else {
      // Placeholder content path: derive from SceneMetadata fields.
      if (scene.emotion) tallyAdd(emotionTally, scene.emotion, seconds)
      if (scene.musicEmotion) tallyAdd(musicEmotionTally, scene.musicEmotion, seconds)
    }
    for (const product of scene.products) {
      tallyAdd(productTally, product.name, seconds)
    }
  }

  // ---- Beats (collapsed scene digest) ------------------------------------
  // Same `groupJsonScenes` algorithm the JSON panel uses to merge
  // adjacent same-beat scenes. For DHYH this typically collapses
  // ~175 scenes to ~25–35 beats — the headline benefit of summary
  // size reduction.
  const beats = groupJsonScenes(playbackScenes, playbackScenes.length - 1).map((group) => ({
    start: round(group.startSec, 2),
    end: round(group.endSec, 2),
    label: group.label,
    headline: oneLineHeadline(group.leadScene),
    tags: compactTagsForScene(group.leadScene),
  }))

  // ---- Compose summary (omit empty rollups) ------------------------------
  const rollups: Record<string, RollupEntry[]> = {}
  if (iabTally.size > 0) rollups.iab = tallyTop(iabTally, 5, totalSceneSeconds)
  if (locationTally.size > 0) rollups.locations = tallyTop(locationTally, 5, totalSceneSeconds)
  if (objectTally.size > 0) rollups.objects = tallyTop(objectTally, 10, totalSceneSeconds)
  if (sentimentTally.size > 0)
    rollups.sentiment = tallyTop(sentimentTally, 3, totalSceneSeconds)
  if (emotionTally.size > 0) rollups.emotion = tallyTop(emotionTally, 3, totalSceneSeconds)
  if (musicEmotionTally.size > 0)
    rollups.music_emotion = tallyTop(musicEmotionTally, 3, totalSceneSeconds)

  const brandSafety: { verdict: string; garm_top?: RollupEntry[] } =
    garmTally.size === 0
      ? { verdict: 'not_evaluated' }
      : {
          verdict: 'see_top_factors',
          garm_top: tallyTop(garmTally, 3, totalSceneSeconds),
        }

  const taxonomyCoverage: Record<string, 0 | 1> = {
    iab: iabTally.size > 0 ? 1 : 0,
    locations: locationTally.size > 0 ? 1 : 0,
    objects: objectTally.size > 0 ? 1 : 0,
    sentiment: sentimentTally.size > 0 ? 1 : 0,
    music_emotion: musicEmotionTally.size > 0 ? 1 : 0,
    products: productTally.size > 0 ? 1 : 0,
    garm: garmTally.size > 0 ? 1 : 0,
  }

  const summary = {
    summary: {
      type: 'kerv-content-summary',
      version: 1,
      generated_at: new Date().toISOString(),
      source_content_id: contentId,
      source_tier: selectedTier,
      source_playback_mode: selectedAdPlayback,
    },
    content: {
      title: contentTitle,
      id: contentId,
      duration_seconds: round(playbackDurationSeconds, 2),
      scene_count: playbackScenes.length,
      beat_count: beats.length,
    },
    rollups,
    brand_safety: brandSafety,
    commerce: {
      total_product_matches: totalProductMatches,
      unique_products: productTally.size,
      top_products: tallyTop(productTally, 10, totalSceneSeconds),
    },
    beats,
    stats: {
      total_objects_detected: totalObjectsDetected,
      taxonomy_coverage: taxonomyCoverage,
    },
  }

  return JSON.stringify(summary, null, 2)
}

export const getJsonDownloadContent = (
  option: JsonDownloadOption,
  originalJsonDownloadString: string,
  summaryJsonDownloadString: string
) =>
  option === 'Original JSON'
    ? {
        content: originalJsonDownloadString,
        fileName: 'original-json-export.json',
      }
    : {
        content: summaryJsonDownloadString,
        fileName: 'summary-json-export.json',
      }
