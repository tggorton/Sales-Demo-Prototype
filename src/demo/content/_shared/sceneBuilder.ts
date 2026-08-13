// Shared scene-bundle builder — content-agnostic.
//
// Owns the full Tier-JSON → SceneMetadata pipeline that every content
// tile uses identically: type definitions for the raw JSON shape,
// per-scene parsing (taxonomies / products / raw JSON / "is this scene
// meaningful"), the source-time-to-clip-time mapper (clip-native by
// default), the taxonomy gap-fill pass, and the cached entry point
// `getScenesForContent`.
//
// Content-specific behaviours that don't fit the generic pipeline are
// supplied via callbacks on the `SceneBuilderOptions` parameter:
//
//   - `editorialLocationOverlay`: maps a clip-time to a content-curated
//     location label (DHYH uses this for its kitchen/bathroom band
//     sequence; MasterChef doesn't supply it, so locations flow through
//     verbatim from the per-scene JSON).
//   - `sceneToClipRangeMapper`: maps a scene's `startTime`/`endTime`
//     onto the spliced clip timeline. Default is clip-native pass-
//     through (DHYH's two-segment source-splice would supply its own
//     mapper here when `tierTimeBase === 'source'`).
//
// Per-content wrappers (`src/demo/content/<id>/scenes.ts`) own the call
// to `getScenesForContent` and the optional callbacks. This module
// never references any specific content's constants or paths.

import { resolveProductImageUrl, resolveTierPayload } from '../../sources'
import type {
  SceneMetadata,
  SceneProduct,
  TaxonomyOption,
  TaxonomySceneData,
  TierOption,
} from '../../types'

// ───── Raw JSON shape (trimmed to what we consume) ──────────────────────────

type TierNamed = { name: string; confidence?: number; id?: string }

export type TierProductMatch = {
  product_id?: string | number
  loc_id?: string | number
  name?: string
  price?: string
  image?: string
  image_url?: string
  link?: string
  confidence?: number
  /** Optional override for the time-windowed product dedupe key. By default
   *  identical product_ids collapse if they appear inside
   *  PRODUCT_DEDUPE_WINDOW_SECONDS. Set this to a unique string when you
   *  want a specific occurrence to render as its own card even though it
   *  resolves to the same SKU as another nearby match. */
  dedupe_key?: string
}

const resolveProductImage = (contentId: string, match: TierProductMatch): string =>
  resolveProductImageUrl(contentId, match)

export type TierObject = {
  name: string
  confidence?: number
  product_match?: TierProductMatch[]
  /** Marks product-matching scaffolding objects (derived, not detected).
   *  These power the Products panel and are also listed (after the real
   *  detections) in the Object taxonomy panel, so the two panels agree on
   *  what is on screen. They are still excluded from the "highest
   *  confidence" headline and from `video_metadata.objects` rollups. See
   *  analysis/TIER-PREP-NOTES.md (synthetic-object rule). */
  synthetic?: boolean
}

type TierGarmCategory = {
  id?: string
  name: string
  risk_level?: string
  confidence?: number
}

type TierSentiment = { name: string; id?: string; confidence?: number }

type TierMusicEmotion =
  | { name: string; confidence?: number }
  | Array<{ name: string; confidence?: number }>

// Unified emotion taxonomy. `emotion` supersedes the legacy `music_emotion`
// field; in the current clip-native data the music moods are folded into
// `emotion` as additional categories.
type TierEmotionEntry = { name: string; id?: string; confidence?: number }
type TierEmotion = TierEmotionEntry | TierEmotionEntry[]

type TierFace = {
  name?: string
  confidence?: number
  gender?: string
  age_group?: string
}

export type TierScene = {
  scene: number
  startTime: number
  endTime: number
  lengthInSeconds?: number
  audio_transcript?: string
  description?: string
  iab_taxonomy?: TierNamed[]
  garm_category?: TierGarmCategory[]
  sentiment_analysis?: TierSentiment | TierSentiment[]
  labels?: TierNamed[]
  logos?: TierNamed[]
  faces?: TierFace[]
  text?: Array<{ value?: string; text?: string }>
  locations?: TierNamed[]
  objects?: TierObject[]
  emotion?: TierEmotion
  music_emotion?: TierMusicEmotion
  shoppable_score?: number
}

type TierVideoLocation = {
  id?: string
  name: string
  confidence?: number
  count?: number
  screen_time?: number
  screen_time_percentage?: number
}

type TierVideoMetadata = {
  locations?: TierVideoLocation[]
}

export type TierPayload = {
  duration_in_seconds: number
  aspect_ratio: string
  total_scenes: number
  Scenes: TierScene[]
  video_metadata?: TierVideoMetadata
}

// ───── Public scene-bundle shape ────────────────────────────────────────────

export type SceneBundle = {
  scenes: SceneMetadata[]
  duration: number
  tier: TierOption
  hasProductData: boolean
}

// ───── Resolved location ────────────────────────────────────────────────────

export type LocationResolutionSource = 'model' | 'editorial_timeline'

export type ResolvedLocation = {
  name: string
  confidence: number
  source: LocationResolutionSource
}

// ───── Clip range (after time-base mapping) ─────────────────────────────────

export type ClipRange = { start: number; end: number }

// ───── Default constants ────────────────────────────────────────────────────

/** Default confidence threshold above which a per-scene location wins
 *  over the editorial overlay (or empty fallback). Any content that
 *  needs a different threshold can wrap `getScenesForContent` with a
 *  modified call (the constant is exported for that case). */
export const DEFAULT_SCENE_LOCATION_OVERRIDE_CONFIDENCE = 0.85

// ───── Builder options ──────────────────────────────────────────────────────

export type SceneBuilderOptions = {
  /** Total clip duration in seconds. Used for the clip-native mapper's
   *  upper-clamp and stamped on the returned bundle. */
  clipDurationSeconds: number
  /** Optional content-curated location overlay. Called when the scene
   *  doesn't carry its own high-confidence `locations[0]`. DHYH supplies
   *  an editorial kitchen/bathroom band sequence; other contents leave
   *  this undefined and the Location panel renders empty for scenes
   *  without per-scene location data. */
  editorialLocationOverlay?: (clipStartSec: number) => ResolvedLocation | null
  /** Optional content-specific scene-to-clip-time mapper. Default is
   *  clip-native pass-through (scene `startTime`/`endTime` are already
   *  on the playable clip axis). DHYH's two-segment splice mode would
   *  supply a remapper here when its `tierTimeBase === 'source'`. */
  sceneToClipRangeMapper?: (scene: TierScene) => ClipRange | null
  /** Override for the per-scene location confidence threshold. Defaults
   *  to `DEFAULT_SCENE_LOCATION_OVERRIDE_CONFIDENCE`. */
  locationOverrideConfidence?: number
}

// ───── Tier → JSON resolution (cache + entry point) ─────────────────────────

const bundleCache: Partial<Record<string, Promise<SceneBundle>>> = {}

const cacheKey = (contentId: string, tier: TierOption) => `${contentId}|${tier}`

/** Generic content-scoped scene loader. Each content's `scenes.ts`
 *  wrapper calls this with its contentId, clipDurationSeconds, and
 *  optional callbacks for content-specific overlays. The result is
 *  cached per `(contentId, tier)` pair. */
export const getScenesForContent = (
  contentId: string,
  tier: TierOption,
  options: SceneBuilderOptions
): Promise<SceneBundle> => {
  const key = cacheKey(contentId, tier)
  if (!bundleCache[key]) {
    bundleCache[key] = resolveTierPayload(contentId, tier).then((payload) =>
      buildBundle(payload as unknown as TierPayload, tier, contentId, options)
    )
  }
  return bundleCache[key] as Promise<SceneBundle>
}

// ───── Builder helpers ──────────────────────────────────────────────────────

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

const formatConfidence = (value?: number, fallback = 0.85) =>
  (typeof value === 'number' ? clamp(value, 0, 1) : fallback).toFixed(2)

const riskLevelToLabel = (level?: string) => {
  switch ((level ?? '').toLowerCase()) {
    case 'high':
      return 'High Risk'
    case 'medium':
      return 'Medium Risk'
    case 'low':
      return 'Low Risk'
    default:
      return 'Suitable'
  }
}

// Normalize a scene's emotion signal to a flat list of {name, confidence}.
// Prefers the unified `emotion` field; falls back to legacy `music_emotion`.
const sceneEmotions = (scene: TierScene): TierEmotionEntry[] => {
  const emo = scene.emotion
  if (Array.isArray(emo)) return emo.filter((e) => e && e.name)
  if (emo && emo.name) return [emo]
  const music = scene.music_emotion
  if (Array.isArray(music)) return music.filter((m) => m && m.name)
  if (music && music.name) return [music]
  return []
}

const firstEmotion = (scene: TierScene): TierEmotionEntry | null =>
  sceneEmotions(scene)[0] ?? null

const TIER_HAS_PRODUCTS: Record<TierOption, boolean> = {
  'Assets Summary': false,
  'Basic Scene': false,
  'Advanced Scene': false,
  'Categorical Product Match': true,
  'Exact Product Match': true,
}

const buildProducts = (
  scene: TierScene,
  tierHasProducts: boolean,
  contentId: string
): SceneProduct[] => {
  if (!tierHasProducts) return []
  const products: SceneProduct[] = []
  const seen = new Set<string>()
  for (const obj of scene.objects ?? []) {
    for (const match of obj.product_match ?? []) {
      const baseId = String(match.product_id ?? match.loc_id ?? `${obj.name}-${match.name}`)
      if (seen.has(baseId)) continue
      seen.add(baseId)
      const productKey =
        match.dedupe_key && match.dedupe_key.length > 0 ? match.dedupe_key : baseId
      const description = [match.price, obj.name].filter(Boolean).join(' · ') || obj.name
      products.push({
        id: `${contentId}-${scene.scene}-${baseId}`,
        productKey,
        name: match.name || obj.name,
        description,
        image: resolveProductImage(contentId, match),
      })
    }
  }
  return products
}

// ───── Scene location ───────────────────────────────────────────────────────

const resolveSceneLocation = (
  scene: TierScene,
  clipStartSec: number,
  options: SceneBuilderOptions
): ResolvedLocation | null => {
  const threshold =
    options.locationOverrideConfidence ?? DEFAULT_SCENE_LOCATION_OVERRIDE_CONFIDENCE
  const sceneLocation = scene.locations?.[0]
  if (sceneLocation?.name && (sceneLocation.confidence ?? 0) >= threshold) {
    return {
      name: sceneLocation.name,
      confidence: sceneLocation.confidence ?? 0,
      source: 'model',
    }
  }
  // Editorial-location overlay is content-specific (e.g. DHYH's curated
  // band sequence). When the active content doesn't supply one, the
  // Location panel renders empty for scenes without high-confidence
  // per-scene location data.
  return options.editorialLocationOverlay?.(clipStartSec) ?? null
}

// How many object names the Object taxonomy card lists. Raised from 6 when
// synthetic (product-matched) objects joined the list — at 6 the tool-heavy
// build scenes were truncated before reaching the saw / level / gloves that
// the Products panel is simultaneously selling.
const OBJECT_TAXONOMY_MAX_NAMES = 10

// How many primary objects a single scene surfaces, each as its own pill.
const OBJECT_TAXONOMY_MAX_MAINS = 4

// Buckets an object name so a main's "Objects:" list holds things related to
// it: a Person lists what they are wearing, a tool lists the other tools on
// the job, a fixture lists the rest of the room. Keyword-based so it copes
// with names coming from any content's upstream model.
type ObjectCategory = 'person' | 'apparel' | 'tool' | 'fixture'

// What a main object's list should be drawn from. A Person lists the
// apparel/PPE they are wearing rather than other people; everything else
// lists its own kind.
const RELATED_CATEGORY: Record<ObjectCategory, ObjectCategory> = {
  person: 'apparel',
  apparel: 'apparel',
  tool: 'tool',
  fixture: 'fixture',
}

const objectCategory = (name: string): ObjectCategory => {
  const n = (name ?? '').toLowerCase()
  if (/\b(person|people|man|woman|hand|face)\b/.test(n)) return 'person'
  if (
    /shirt|jean|trouser|pant|short|jacket|blazer|coat|sweater|sweatshirt|dress|skirt|boot|shoe|sandal|footwear|glove|glasses|goggle|hat|helmet|cap|belt|suspender|harness|bandana|headband|gaiter|sleeve|mask|watch|earring|necklace|bracelet|ring|apron|vest|tie\b/.test(
      n
    )
  )
    return 'apparel'
  if (
    /saw|hammer|drill|level|tape measure|pry|crowbar|grinder|chalk|brush|ladder|tool|plank|stud|drywall|beam|post|bracket|screw|nail|paint|block|lumber|timber|broom|log|trim|switch|outlet|mount|cable|cord|pipe|duct|hose|vent|wire|filter|heater|flange|rock|scaffold|blade|wrench|pliers/.test(
      n
    )
  )
    return 'tool'
  return 'fixture'
}

// ───── Taxonomy data per scene ──────────────────────────────────────────────

const buildTaxonomyData = (
  scene: TierScene,
  clipStartSec: number,
  contentId: string,
  options: SceneBuilderOptions
): Partial<Record<TaxonomyOption, TaxonomySceneData>> => {
  const data: Partial<Record<TaxonomyOption, TaxonomySceneData>> = {}

  const iab = scene.iab_taxonomy?.[0]
  if (iab) {
    const considered = (scene.iab_taxonomy ?? [])
      .slice(1, 5)
      .map((item) => item.name)
      .filter((name): name is string => Boolean(name) && name !== iab.name)
      .join(', ')
    const sections: TaxonomySceneData['sections'] = [
      { label: 'Primary Category:', value: iab.name },
    ]
    if (considered) {
      sections.push({ label: 'Considered:', value: considered })
    }
    sections.push({ label: 'Confidence:', value: formatConfidence(iab.confidence, 0.85) })
    data.IAB = {
      headline: iab.name,
      chip: formatConfidence(iab.confidence, 0.85),
      sections,
    }
  }

  const sentimentRaw = Array.isArray(scene.sentiment_analysis)
    ? scene.sentiment_analysis[0]
    : scene.sentiment_analysis
  if (sentimentRaw?.name) {
    data.Sentiment = {
      headline: sentimentRaw.name,
      chip: formatConfidence(sentimentRaw.confidence, 0.88),
      sections: [
        { label: 'Sentiment:', value: sentimentRaw.name },
        { label: 'Confidence:', value: formatConfidence(sentimentRaw.confidence, 0.88) },
      ],
    }
  }

  const garm = scene.garm_category?.[0]
  if (garm) {
    const sections: TaxonomySceneData['sections'] = [
      { label: 'GARM Category:', value: garm.name },
    ]
    if (garm.risk_level) {
      sections.push({ label: 'Risk Level:', value: garm.risk_level })
    }
    sections.push({ label: 'Confidence:', value: formatConfidence(garm.confidence, 0.9) })
    data['Brand Safety'] = {
      headline: riskLevelToLabel(garm.risk_level),
      chip: formatConfidence(garm.confidence, 0.9),
      sections,
    }
  }

  const emotions = sceneEmotions(scene)
  const topEmotion = emotions[0]
  if (topEmotion?.name) {
    const allNames = emotions.map((e) => e.name).filter(Boolean).join(', ')
    data.Emotion = {
      headline: topEmotion.name,
      chip: formatConfidence(topEmotion.confidence, 0.82),
      sections: [
        { label: 'Emotion:', value: allNames || topEmotion.name },
        { label: 'Confidence:', value: formatConfidence(topEmotion.confidence, 0.82) },
      ],
    }
  }

  const resolvedLocation = resolveSceneLocation(scene, clipStartSec, options)
  const resolvedName = resolvedLocation?.name ?? null
  const resolvedConfidence = resolvedLocation?.confidence

  if (resolvedName) {
    const sections: TaxonomySceneData['sections'] = [
      { label: 'Detected Location:', value: resolvedName },
      { label: 'Confidence:', value: formatConfidence(resolvedConfidence, 0.9) },
    ]
    data.Location = {
      headline: resolvedName,
      chip: formatConfidence(resolvedConfidence, 0.9),
      sections,
    }
  }

  const faceCount = scene.faces?.length ?? 0
  if (faceCount > 0) {
    const sample = scene.faces?.[0]
    const details = (scene.faces ?? [])
      .slice(0, 3)
      .map((face) => [face.name, face.gender, face.age_group].filter(Boolean).join(' · '))
      .filter(Boolean)
      .join('; ')
    const sections: TaxonomySceneData['sections'] = [
      { label: 'Face Count:', value: String(faceCount) },
    ]
    if (details) {
      sections.push({ label: 'Details:', value: details })
    }
    sections.push({ label: 'Confidence:', value: formatConfidence(sample?.confidence, 0.8) })
    data.Faces = {
      headline: `${faceCount} face${faceCount === 1 ? '' : 's'} detected`,
      chip: formatConfidence(sample?.confidence, 0.8),
      sections,
    }
  }

  // Object taxonomy lists DETECTED objects first, then the synthetic ones.
  // Synthetic entries are the product-matching layer: they are exactly the
  // items the Products panel is selling (saw, level, work gloves), so hiding
  // them made the Object and Products panels disagree about what is on
  // screen. They are appended rather than interleaved so the headline still
  // comes from a real detection with a real confidence.
  const all = scene.objects ?? []
  const detected = all.filter((obj) => !obj.synthetic)
  const uniqueNames = (objects: TierObject[]): string[] => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const obj of objects) {
      if (obj.name && !seen.has(obj.name)) {
        seen.add(obj.name)
        out.push(obj.name)
      }
    }
    return out
  }

  if (all.length > 0) {
    // A scene gets SEVERAL main objects, not one. Each becomes its own pill
    // with its own confidence and its own "Objects:" list of related items —
    // so a build scene reads `Tape measure`, `Person`, `Saw` as three primary
    // objects rather than burying the saw in one flat list under the first.
    const byConfidence = [...detected].sort(
      (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)
    )
    const productCarriers = all.filter((obj) => obj.product_match?.length)

    // Candidate mains, best first: the strongest detection, then the people,
    // then whatever the Products panel is selling. The remaining slots prefer
    // categories not yet represented, so a scene doesn't headline four
    // variations of the same thing (Safety glasses / Shirt / Jeans / Boot).
    const mainCandidates: TierObject[] = []
    const claimed = new Set<string>()
    const claimedCategories = new Set<ObjectCategory>()
    const take = (obj: TierObject | undefined): boolean => {
      if (!obj?.name || claimed.has(obj.name)) return false
      claimed.add(obj.name)
      claimedCategories.add(objectCategory(obj.name))
      mainCandidates.push(obj)
      return mainCandidates.length >= OBJECT_TAXONOMY_MAX_MAINS
    }

    let full = false
    for (const obj of [
      byConfidence[0],
      byConfidence.find((o) => objectCategory(o.name) === 'person'),
      ...productCarriers,
    ]) {
      if (!full && obj) full = take(obj)
    }
    // Apparel is what a Person is wearing — it belongs in a main's list, not
    // as a main of its own. (The single strongest detection above is exempt,
    // so the lead pill still matches the upstream platform's headline.)
    const fillable = byConfidence.filter((o) => objectCategory(o.name) !== 'apparel')
    // Fresh categories first, then anything left, both strongest-first.
    for (const pass of [
      fillable.filter((o) => !claimedCategories.has(objectCategory(o.name))),
      fillable,
    ]) {
      for (const obj of pass) {
        if (full) break
        full = take(obj)
      }
    }

    const groups = mainCandidates.map((main, mainIdx) => {
      const wanted = RELATED_CATEGORY[objectCategory(main.name)]
      const related = uniqueNames(
        all.filter((obj) => obj.name !== main.name && objectCategory(obj.name) === wanted)
      )
      // Nothing shares this main's related category (a lone fixture, say) —
      // fall back to the rest of the scene so the list is never empty.
      const pool = related.length
        ? related
        : uniqueNames(all).filter((name) => name !== main.name)
      // Same-category mains would otherwise print an identical list under
      // each pill; offsetting the start shows more of the scene overall.
      const offset = pool.length > OBJECT_TAXONOMY_MAX_NAMES ? mainIdx % pool.length : 0
      const rotated = [...pool.slice(offset), ...pool.slice(0, offset)]
      const sections: TaxonomySceneData['sections'] = []
      if (rotated.length) {
        sections.push({
          label: 'Objects:',
          value: rotated.slice(0, OBJECT_TAXONOMY_MAX_NAMES).join(', '),
        })
      }
      sections.push({ label: 'Confidence:', value: formatConfidence(main.confidence, 0.8) })
      return {
        headline: main.name,
        chip: formatConfidence(main.confidence, 0.8),
        sections,
      }
    })

    if (groups.length > 0) {
      data.Object = { ...groups[0], extraGroups: groups.slice(1) }
    }
  }

  const logoList = scene.logos ?? []
  if (logoList.length > 0) {
    const names = logoList
      .slice(0, 6)
      .map((logo) => logo.name)
      .filter(Boolean)
      .join(', ')
    const top = logoList[0]
    data.Logo = {
      headline: top?.name ?? 'Logos detected',
      chip: formatConfidence(top?.confidence, 0.8),
      sections: [
        { label: 'Logos:', value: names },
        { label: 'Confidence:', value: formatConfidence(top?.confidence, 0.8) },
      ],
    }
  }

  // Suppress unused-parameter lint when no callback consumes contentId.
  void contentId
  return data
}

// ───── Raw JSON for the JSON panel ──────────────────────────────────────────

const buildRawJsonForScene = (
  scene: TierScene,
  resolvedLocation: ResolvedLocation | null
) => {
  const synthesizedLocations =
    !scene.locations?.length && resolvedLocation
      ? [
          {
            name: resolvedLocation.name,
            confidence: resolvedLocation.confidence,
            source: resolvedLocation.source,
          },
        ]
      : undefined

  const raw: Record<string, unknown> = {
    scene: scene.scene,
    startTime: scene.startTime,
    endTime: scene.endTime,
    lengthInSeconds: scene.lengthInSeconds,
    audio_transcript: scene.audio_transcript || undefined,
    description: scene.description || undefined,
    iab_taxonomy: scene.iab_taxonomy?.length ? scene.iab_taxonomy : undefined,
    garm_category: scene.garm_category?.length ? scene.garm_category : undefined,
    sentiment_analysis: scene.sentiment_analysis ?? undefined,
    labels: scene.labels?.length ? scene.labels : undefined,
    logos: scene.logos?.length ? scene.logos : undefined,
    faces: scene.faces?.length ? scene.faces : undefined,
    locations: scene.locations?.length ? scene.locations : synthesizedLocations,
    objects: scene.objects?.length ? scene.objects : undefined,
    emotion: scene.emotion ?? undefined,
    music_emotion: scene.music_emotion ?? undefined,
    shoppable_score: scene.shoppable_score,
  }
  Object.keys(raw).forEach((k) => raw[k] === undefined && delete raw[k])
  return raw
}

// A scene is "meaningful" once any upstream analysis field has data.
// Production slates usually have all of these empty.
const isSceneMeaningful = (scene: TierScene) =>
  Boolean(
    scene.iab_taxonomy?.length ||
      scene.objects?.length ||
      scene.garm_category?.length ||
      scene.sentiment_analysis ||
      scene.locations?.length ||
      scene.faces?.length ||
      sceneEmotions(scene).length ||
      scene.labels?.length ||
      scene.logos?.length
  )

// ───── Scene → clip-time mapping ────────────────────────────────────────────

/** Default clip-native mapper. Scene `startTime`/`endTime` are already
 *  on the playable clip axis; clamp to `[0, clipDurationSeconds]` and
 *  drop zero/negative-length scenes. Per-content wrappers can override
 *  this via `SceneBuilderOptions.sceneToClipRangeMapper` (DHYH uses
 *  this for its two-segment source-splice mode). */
const clipNativeRange = (
  start: number,
  end: number,
  clipDurationSeconds: number
): ClipRange | null => {
  const s = clamp(start, 0, clipDurationSeconds)
  const e = clamp(end, 0, clipDurationSeconds)
  if (e <= s) return null
  return { start: s, end: e }
}

// ───── Per-scene build ──────────────────────────────────────────────────────

const buildScene = (
  scene: TierScene,
  index: number,
  tier: TierOption,
  clipRange: ClipRange,
  contentId: string,
  options: SceneBuilderOptions
): SceneMetadata => {
  const sentimentRaw = Array.isArray(scene.sentiment_analysis)
    ? scene.sentiment_analysis[0]
    : scene.sentiment_analysis
  const music = firstEmotion(scene)
  const iabConsidered =
    (scene.iab_taxonomy ?? [])
      .slice(0, 3)
      .map((item) => item.name)
      .join(', ') || sentimentRaw?.name || 'Unknown'

  const meaningful = isSceneMeaningful(scene)
  const taxonomyData = buildTaxonomyData(scene, clipRange.start, contentId, options)

  return {
    id: `${contentId}-scene-${scene.scene}`,
    start: clipRange.start,
    end: clipRange.end,
    sceneLabel: `Scene ${index + 1}`,
    emotion: music?.name ?? sentimentRaw?.name ?? 'Neutral',
    emotionScore: clamp(music?.confidence ?? sentimentRaw?.confidence ?? 0.75, 0, 1),
    considered: iabConsidered,
    reasoning:
      scene.description?.slice(0, 240) ||
      scene.audio_transcript?.slice(0, 240) ||
      'Scene derived from upstream analysis pipeline.',
    textData: scene.audio_transcript?.slice(0, 160) || scene.description?.slice(0, 160) || '—',
    musicEmotion: music?.name ?? 'Ambient',
    musicScore: clamp(music?.confidence ?? 0.8, 0, 1),
    cta: 'In-Content-CTA',
    products: buildProducts(scene, TIER_HAS_PRODUCTS[tier] ?? false, contentId),
    taxonomyData,
    rawJson: meaningful
      ? buildRawJsonForScene(scene, resolveSceneLocation(scene, clipRange.start, options))
      : undefined,
    isEmpty: !meaningful,
  }
}

// ───── Taxonomy gap-fill ────────────────────────────────────────────────────
//
// Taxonomy options that are content-wide by nature — the classification
// is stable across the whole clip even when the upstream analysis only
// emits a value on some scenes. Bidirectionally fill gaps in
// `scene.taxonomyData` from the nearest neighbour so the panel never goes
// blank while valid data exists somewhere else in the clip.
// `Location` is intentionally excluded — gap-filling caused per-scene
// outlier labels to propagate across many unrelated scenes.

const GAP_FILL_TAXONOMIES: TaxonomyOption[] = [
  'IAB',
  'Sentiment',
  'Brand Safety',
  'Emotion',
  'Faces',
  'Object',
]

const fillTaxonomyGaps = (scenes: SceneMetadata[]): void => {
  for (const tax of GAP_FILL_TAXONOMIES) {
    let lastSeen: TaxonomySceneData | null = null
    for (const scene of scenes) {
      if (scene.isEmpty || !scene.taxonomyData) continue
      const current = scene.taxonomyData[tax]
      if (current) {
        lastSeen = current
      } else if (lastSeen) {
        scene.taxonomyData[tax] = lastSeen
      }
    }
    let nextSeen: TaxonomySceneData | null = null
    for (let i = scenes.length - 1; i >= 0; i--) {
      const scene = scenes[i]
      if (scene.isEmpty || !scene.taxonomyData) continue
      const current = scene.taxonomyData[tax]
      if (current) {
        nextSeen = current
      } else if (nextSeen) {
        scene.taxonomyData[tax] = nextSeen
      }
    }
  }
}

// ───── Top-level bundle build ───────────────────────────────────────────────

const buildBundle = (
  payload: TierPayload,
  tier: TierOption,
  contentId: string,
  options: SceneBuilderOptions
): SceneBundle => {
  const mapper =
    options.sceneToClipRangeMapper ??
    ((scene: TierScene) =>
      clipNativeRange(scene.startTime, scene.endTime, options.clipDurationSeconds))

  const remapped = payload.Scenes.map((scene) => ({ scene, range: mapper(scene) })).filter(
    (entry): entry is { scene: TierScene; range: ClipRange } => entry.range !== null
  )
  remapped.sort((a, b) => a.range.start - b.range.start)
  const scenes = remapped.map(({ scene, range }, index) =>
    buildScene(scene, index, tier, range, contentId, options)
  )
  fillTaxonomyGaps(scenes)
  return {
    tier,
    duration: options.clipDurationSeconds,
    scenes,
    hasProductData: TIER_HAS_PRODUCTS[tier] ?? false,
  }
}
