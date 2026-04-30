import type {
  AdDecisioningTailItem,
  AdPlaybackOption,
  JsonDownloadOption,
  SceneMetadata,
  TierOption,
} from '../types'

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
// detail JSON. Designed for indexing / cataloging / quick review rather
// than granular analysis. Schema follows the spec roughed out in Phase 9
// follow-up — `summary_metadata` provenance, `content_fingerprint` overall
// shape, `aggregated_taxonomy` rollups (top IAB, locations, objects,
// emotion arc, sentiment), `commerce_summary`, `scene_digest` (compact
// per-scene), and `statistical_metadata`. Brand-safety verdict is
// included only when the source content actually emits GARM data
// (DHYH hides Brand Safety per its `ContentConfig.hiddenTaxonomies`,
// so this defaults to "not_evaluated" for now).
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

/** Aggregate `{name, weight}` rollup, sorted desc by weight, top N. */
const topByWeight = <T extends { name: string }>(
  items: Array<T & { weight: number }>,
  topN: number
): Array<T & { weight: number }> =>
  [...items].sort((a, b) => b.weight - a.weight).slice(0, topN)

const round = (value: number, decimals = 3): number => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

type WeightedTally = Map<string, { weight: number; appearances: number }>

const tallyAdd = (tally: WeightedTally, name: string, weight: number): void => {
  if (!name) return
  const prev = tally.get(name) ?? { weight: 0, appearances: 0 }
  tally.set(name, { weight: prev.weight + weight, appearances: prev.appearances + 1 })
}

const tallyTop = (
  tally: WeightedTally,
  topN: number,
  totalWeight: number
): Array<{ name: string; weight: number; share: number; appearances: number }> => {
  const totals = totalWeight > 0 ? totalWeight : 1
  return topByWeight(
    Array.from(tally, ([name, agg]) => ({
      name,
      weight: round(agg.weight, 2),
      share: round(agg.weight / totals, 4),
      appearances: agg.appearances,
    })),
    topN
  )
}

const sceneSeconds = (scene: SceneMetadata): number =>
  Math.max(0, scene.end - scene.start)

const formatTimestamp = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds))
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const oneLineDescription = (scene: SceneMetadata): string => {
  const raw = rawJsonOf(scene)
  if (raw?.audio_transcript) {
    const trimmed = raw.audio_transcript.trim().replace(/\s+/g, ' ')
    return trimmed.length > 140 ? `${trimmed.slice(0, 137)}…` : trimmed
  }
  if (scene.reasoning) return scene.reasoning
  if (scene.considered) return `Considered: ${scene.considered}`
  return scene.sceneLabel
}

const primaryTagsForScene = (scene: SceneMetadata): string[] => {
  const tags: string[] = []
  const raw = rawJsonOf(scene)
  if (raw) {
    const iab = firstName(raw.iab_taxonomy)
    if (iab) tags.push(`IAB: ${iab}`)
    const location = firstName(raw.locations)
    if (location) tags.push(`Location: ${location}`)
    const sentiment = firstName(raw.sentiment_analysis)
    if (sentiment) tags.push(`Sentiment: ${sentiment}`)
    const music = firstName(raw.music_emotion)
    if (music) tags.push(`Music: ${music}`)
  } else {
    if (scene.emotion) tags.push(`Emotion: ${scene.emotion}`)
    if (scene.musicEmotion) tags.push(`Music: ${scene.musicEmotion}`)
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
  let totalConfidenceSum = 0
  let totalConfidenceCount = 0

  for (const scene of meaningfulScenes) {
    const seconds = sceneSeconds(scene)
    totalSceneSeconds += seconds

    const raw = rawJsonOf(scene)
    if (raw) {
      // IAB rollup — weight by screen time, accumulate across the array
      // so secondary tags are credited too (the panel only shows top 5
      // but the rollup considers everything).
      for (const entry of raw.iab_taxonomy ?? []) {
        if (!entry?.name) continue
        const conf = typeof entry.confidence === 'number' ? entry.confidence : 1
        tallyAdd(iabTally, entry.name, seconds * conf)
        totalConfidenceSum += conf
        totalConfidenceCount += 1
      }
      // Locations: scene-level only (the editorial-timeline retrofit is
      // presentation logic, not source signal — the summary should
      // reflect the model's actual output).
      for (const entry of raw.locations ?? []) {
        if (!entry?.name) continue
        const conf = typeof entry.confidence === 'number' ? entry.confidence : 1
        tallyAdd(locationTally, entry.name, seconds * conf)
      }
      // Objects: every named object on screen, weighted by screen time.
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
      // Sentiment: single value per scene typically.
      const sentiment = firstName(raw.sentiment_analysis)
      if (sentiment) tallyAdd(sentimentTally, sentiment, seconds)
      // Music emotion: single value per scene typically.
      const music = firstName(raw.music_emotion)
      if (music) tallyAdd(musicEmotionTally, music, seconds)
      // GARM (brand-safety) — only counted when actually emitted.
      // Hidden in the demo UI per ContentConfig.hiddenTaxonomies, but
      // the summary surfaces it for downstream consumers.
      for (const entry of raw.garm_category ?? []) {
        if (!entry?.name) continue
        tallyAdd(garmTally, entry.name, seconds)
      }
    } else {
      // Placeholder content path: derive from SceneMetadata fields.
      if (scene.emotion) tallyAdd(emotionTally, scene.emotion, seconds)
      if (scene.musicEmotion) tallyAdd(musicEmotionTally, scene.musicEmotion, seconds)
    }

    // Products: always credit, regardless of source path.
    for (const product of scene.products) {
      tallyAdd(productTally, product.name, seconds)
    }
  }

  // ---- Aggregated taxonomy ------------------------------------------------
  const iabRollup = tallyTop(iabTally, 5, totalSceneSeconds)
  const locationsRollup = tallyTop(locationTally, 5, totalSceneSeconds)
  const objectsRollup = tallyTop(objectTally, 10, totalSceneSeconds)
  const sentimentRollup = tallyTop(sentimentTally, 3, totalSceneSeconds)
  const emotionRollup = tallyTop(emotionTally, 3, totalSceneSeconds)
  const musicRollup = tallyTop(musicEmotionTally, 3, totalSceneSeconds)
  const productsRollup = tallyTop(productTally, 12, totalSceneSeconds)
  const garmRollup = tallyTop(garmTally, 3, totalSceneSeconds)

  // ---- Brand-safety verdict ----------------------------------------------
  // Coarse rollup from GARM emissions when present; otherwise mark as
  // not_evaluated. Future content with explicit GARM signal can refine
  // this into a proper floor/low/medium/high classification.
  const brandSafety = (() => {
    if (garmRollup.length === 0) {
      return {
        verdict: 'not_evaluated',
        garm_top: [],
        rationale:
          'No GARM signal present in this content (or the per-content config hides it). Downstream consumers should fall back to their own classification.',
      }
    }
    return {
      verdict: 'see_top_factors',
      garm_top: garmRollup,
      rationale:
        'Verdict is derived from the top GARM categories weighted by screen time. Negative-tone names (e.g. "Debated Sensitive Social Issue") indicate elevated risk; benign categories indicate low risk.',
    }
  })()

  // ---- Scene digest -------------------------------------------------------
  const sceneDigest = meaningfulScenes.map((scene) => {
    const raw = rawJsonOf(scene)
    return {
      scene_id: scene.id,
      label: scene.sceneLabel,
      start_seconds: round(scene.start, 2),
      end_seconds: round(scene.end, 2),
      start_timestamp: formatTimestamp(scene.start),
      end_timestamp: formatTimestamp(scene.end),
      duration_seconds: round(sceneSeconds(scene), 2),
      product_count: scene.products.length,
      primary_iab: raw ? firstName(raw.iab_taxonomy) : null,
      primary_location: raw ? firstName(raw.locations) : null,
      primary_sentiment: raw ? firstName(raw.sentiment_analysis) : scene.emotion || null,
      primary_music: raw ? firstName(raw.music_emotion) : scene.musicEmotion || null,
      one_line_description: oneLineDescription(scene),
      primary_tags: primaryTagsForScene(scene),
    }
  })

  // ---- Statistical metadata ----------------------------------------------
  const taxonomyCoverage = {
    iab: round(iabTally.size > 0 ? 1 : 0, 2),
    locations: round(meaningfulScenes.length > 0 ? locationTally.size > 0 ? 1 : 0 : 0, 2),
    objects: round(objectTally.size > 0 ? 1 : 0, 2),
    sentiment: round(sentimentTally.size > 0 ? 1 : 0, 2),
    music_emotion: round(musicEmotionTally.size > 0 ? 1 : 0, 2),
    products: round(productTally.size > 0 ? 1 : 0, 2),
    garm: round(garmTally.size > 0 ? 1 : 0, 2),
  }

  const summary = {
    summary_metadata: {
      summary_type: 'kerv-content-summary',
      summary_version: 1,
      generated_at: new Date().toISOString(),
      source_content_id: contentId,
      source_tier: selectedTier,
      source_playback_mode: selectedAdPlayback,
    },
    content_fingerprint: {
      title: contentTitle,
      content_id: contentId,
      duration_seconds: round(playbackDurationSeconds, 2),
      duration_timestamp: formatTimestamp(playbackDurationSeconds),
      scene_count: playbackScenes.length,
      meaningful_scene_count: meaningfulScenes.length,
    },
    aggregated_taxonomy: {
      iab_categories: iabRollup,
      locations: locationsRollup,
      objects: objectsRollup,
      sentiment: sentimentRollup,
      emotion: emotionRollup,
      music_emotion: musicRollup,
    },
    brand_safety: brandSafety,
    commerce_summary: {
      total_product_matches: totalProductMatches,
      unique_products: productTally.size,
      total_on_screen_product_seconds: round(
        Array.from(productTally.values()).reduce((sum, agg) => sum + agg.weight, 0),
        2
      ),
      top_products_by_screen_time: productsRollup,
    },
    scene_digest: sceneDigest,
    statistical_metadata: {
      total_scene_seconds: round(totalSceneSeconds, 2),
      average_scene_seconds:
        meaningfulScenes.length > 0
          ? round(totalSceneSeconds / meaningfulScenes.length, 2)
          : 0,
      total_objects_detected: totalObjectsDetected,
      unique_locations: locationTally.size,
      unique_emotions: emotionTally.size + sentimentTally.size,
      average_iab_confidence:
        totalConfidenceCount > 0 ? round(totalConfidenceSum / totalConfidenceCount, 3) : null,
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
