import {
  DHYH_CLIP_DURATION_SECONDS,
  DHYH_SEGMENT_A_DURATION,
  DHYH_SEGMENT_A_SOURCE_END,
  DHYH_SEGMENT_A_SOURCE_START,
  DHYH_SEGMENT_B_SOURCE_END,
  DHYH_SEGMENT_B_SOURCE_START,
  PRODUCT_PLACEHOLDER_IMAGE,
} from '../constants'
import type {
  SceneMetadata,
  SceneProduct,
  TaxonomyOption,
  TaxonomySceneData,
  TierOption,
} from '../types'

// ---------- Raw JSON shape (trimmed to what we consume) ----------

type DhyhNamed = { name: string; confidence?: number; id?: string }

type DhyhProductMatch = {
  product_id?: string | number
  loc_id?: string | number
  name?: string
  price?: string
  image?: string
  image_url?: string
  link?: string
  confidence?: number
}

// Product images shipped alongside the app live under `public/assets/products/`
// using the same relative path the JSON references (e.g. `homedpt/335027444.jpg`).
// Served from the public root at runtime.
const PRODUCT_IMAGE_BASE = '/assets/products/'

const resolveProductImage = (match: DhyhProductMatch): string => {
  if (match.image && match.image.length > 0) {
    return `${PRODUCT_IMAGE_BASE}${match.image.replace(/^\/+/, '')}`
  }
  if (match.image_url && match.image_url.length > 0) {
    return match.image_url
  }
  return PRODUCT_PLACEHOLDER_IMAGE
}

type DhyhObject = {
  name: string
  confidence?: number
  product_match?: DhyhProductMatch[]
}

type DhyhGarmCategory = {
  id?: string
  name: string
  risk_level?: string
  confidence?: number
}

type DhyhSentiment = { name: string; id?: string; confidence?: number }

type DhyhMusicEmotion =
  | { name: string; confidence?: number }
  | Array<{ name: string; confidence?: number }>

type DhyhFace = {
  name?: string
  confidence?: number
  gender?: string
  age_group?: string
}

type DhyhScene = {
  scene: number
  startTime: number
  endTime: number
  lengthInSeconds?: number
  audio_transcript?: string
  description?: string
  iab_taxonomy?: DhyhNamed[]
  garm_category?: DhyhGarmCategory[]
  sentiment_analysis?: DhyhSentiment | DhyhSentiment[]
  labels?: DhyhNamed[]
  logos?: DhyhNamed[]
  faces?: DhyhFace[]
  text?: Array<{ value?: string; text?: string }>
  locations?: DhyhNamed[]
  objects?: DhyhObject[]
  music_emotion?: DhyhMusicEmotion
  shoppable_score?: number
}

type DhyhPayload = {
  duration_in_seconds: number
  aspect_ratio: string
  total_scenes: number
  Scenes: DhyhScene[]
}

// ---------- Public types ----------

export type DhyhSceneBundle = {
  scenes: SceneMetadata[]
  duration: number
  tier: TierOption
  hasProductData: boolean
}

// ---------- Tier → JSON resolution ----------

const resolveTierModule = async (tier: TierOption): Promise<DhyhPayload> => {
  switch (tier) {
    case 'Exact Product Match':
    case 'Categorical Product Match': {
      const mod = await import('./dhyh/tier3.json')
      return (mod.default ?? mod) as unknown as DhyhPayload
    }
    case 'Advanced Scene': {
      const mod = await import('./dhyh/tier2.json')
      return (mod.default ?? mod) as unknown as DhyhPayload
    }
    case 'Basic Scene':
    case 'Assets Summary':
    default: {
      const mod = await import('./dhyh/tier1.json')
      return (mod.default ?? mod) as unknown as DhyhPayload
    }
  }
}

const bundleCache: Partial<Record<TierOption, Promise<DhyhSceneBundle>>> = {}

export const getDhyhScenesForTier = (tier: TierOption): Promise<DhyhSceneBundle> => {
  if (!bundleCache[tier]) {
    bundleCache[tier] = resolveTierModule(tier).then((payload) => buildBundle(payload, tier))
  }
  return bundleCache[tier] as Promise<DhyhSceneBundle>
}

// ---------- Builder helpers ----------

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

const firstMusicEmotion = (value?: DhyhMusicEmotion) => {
  if (!value) return null
  if (Array.isArray(value)) return value[0] ?? null
  return value
}

const TIER_HAS_PRODUCTS: Record<TierOption, boolean> = {
  'Assets Summary': false,
  'Basic Scene': false,
  'Advanced Scene': false,
  'Categorical Product Match': true,
  'Exact Product Match': true,
}

const buildProducts = (scene: DhyhScene, tierHasProducts: boolean): SceneProduct[] => {
  if (!tierHasProducts) return []
  const products: SceneProduct[] = []
  const seen = new Set<string>()
  for (const obj of scene.objects ?? []) {
    for (const match of obj.product_match ?? []) {
      const id = String(match.product_id ?? match.loc_id ?? `${obj.name}-${match.name}`)
      if (seen.has(id)) continue
      seen.add(id)
      const description = [match.price, obj.name].filter(Boolean).join(' · ') || obj.name
      products.push({
        id: `dhyh-${scene.scene}-${id}`,
        productKey: id,
        name: match.name || obj.name,
        description,
        image: resolveProductImage(match),
      })
    }
  }
  return products
}

const buildTaxonomyData = (
  scene: DhyhScene
): Partial<Record<TaxonomyOption, TaxonomySceneData>> => {
  const data: Partial<Record<TaxonomyOption, TaxonomySceneData>> = {}

  const iab = scene.iab_taxonomy?.[0]
  if (iab) {
    const considered =
      (scene.iab_taxonomy ?? [])
        .slice(0, 4)
        .map((item) => item.name)
        .join(', ') || iab.name
    data.IAB = {
      headline: iab.name,
      chip: formatConfidence(iab.confidence, 0.85),
      sections: [
        { label: 'Primary Category:', value: iab.name },
        { label: 'Considered:', value: considered },
        {
          label: 'Reasoning:',
          value:
            scene.description ||
            scene.audio_transcript ||
            `Scene cues align most closely with the ${iab.name} bucket.`,
        },
        {
          label: 'Confidence:',
          value: formatConfidence(iab.confidence, 0.85),
        },
      ],
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
        {
          label: 'Considered:',
          value:
            scene.description?.slice(0, 160) ||
            scene.audio_transcript?.slice(0, 160) ||
            'Scene tone, pacing, and visual cues.',
        },
        {
          label: 'Reasoning:',
          value:
            'Audio/visual signals align with this sentiment classification for the scene window.',
        },
        {
          label: 'Confidence:',
          value: formatConfidence(sentimentRaw.confidence, 0.88),
        },
      ],
    }
  }

  const garm = scene.garm_category?.[0]
  if (garm) {
    data['Brand Safety'] = {
      headline: riskLevelToLabel(garm.risk_level),
      chip: formatConfidence(garm.confidence, 0.9),
      sections: [
        { label: 'GARM Category:', value: garm.name },
        { label: 'Risk Level:', value: garm.risk_level ?? 'Low' },
        {
          label: 'Reasoning:',
          value:
            'GARM signals were evaluated against scene content; the listed level reflects the strongest match.',
        },
        {
          label: 'Confidence:',
          value: formatConfidence(garm.confidence, 0.9),
        },
      ],
    }
  }

  const music = firstMusicEmotion(scene.music_emotion)
  if (music?.name) {
    data.Emotion = {
      headline: music.name,
      chip: formatConfidence(music.confidence, 0.82),
      sections: [
        { label: 'Music Emotion:', value: music.name },
        {
          label: 'Considered:',
          value: 'Instrumentation, tempo, harmonic color, vocal tone.',
        },
        {
          label: 'Reasoning:',
          value:
            scene.description?.slice(0, 200) ||
            'Music features of the scene map most strongly to this emotional label.',
        },
        {
          label: 'Confidence:',
          value: formatConfidence(music.confidence, 0.82),
        },
      ],
    }
  }

  const location = scene.locations?.[0]
  if (location?.name) {
    data.Location = {
      headline: location.name,
      chip: formatConfidence(location.confidence, 0.84),
      sections: [
        { label: 'Detected Location:', value: location.name },
        {
          label: 'Considered:',
          value:
            (scene.locations ?? [])
              .slice(0, 4)
              .map((loc) => loc.name)
              .join(', ') || location.name,
        },
        {
          label: 'Reasoning:',
          value:
            scene.description?.slice(0, 200) ||
            'Foreground composition and scene elements support this location classification.',
        },
        {
          label: 'Confidence:',
          value: formatConfidence(location.confidence, 0.84),
        },
      ],
    }
  }

  const faceCount = scene.faces?.length ?? 0
  if (faceCount > 0) {
    const sample = scene.faces?.[0]
    data.Faces = {
      headline: `${faceCount} face${faceCount === 1 ? '' : 's'} detected`,
      chip: formatConfidence(sample?.confidence, 0.8),
      sections: [
        { label: 'Face Count:', value: String(faceCount) },
        {
          label: 'Details:',
          value:
            (scene.faces ?? [])
              .slice(0, 3)
              .map((face) =>
                [face.name, face.gender, face.age_group].filter(Boolean).join(' · ')
              )
              .filter(Boolean)
              .join('; ') || 'Face metadata available.',
        },
        {
          label: 'Reasoning:',
          value: 'Detected faces and shot composition indicate the listed subject count.',
        },
        {
          label: 'Confidence:',
          value: formatConfidence(sample?.confidence, 0.8),
        },
      ],
    }
  }

  const objectList = scene.objects ?? []
  if (objectList.length > 0) {
    const names = objectList
      .slice(0, 6)
      .map((obj) => obj.name)
      .filter(Boolean)
      .join(', ')
    const top = objectList[0]
    data.Object = {
      headline: top?.name ?? 'Objects detected',
      chip: formatConfidence(top?.confidence, 0.8),
      sections: [
        { label: 'Objects:', value: names },
        {
          label: 'Considered:',
          value: 'Furniture, tools, product, decor, utility items.',
        },
        {
          label: 'Reasoning:',
          value: 'The object group reflects the most persistent physical items visible in the scene.',
        },
        {
          label: 'Confidence:',
          value: formatConfidence(top?.confidence, 0.8),
        },
      ],
    }
  }

  return data
}

const buildRawJsonForScene = (scene: DhyhScene) => {
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
    locations: scene.locations?.length ? scene.locations : undefined,
    objects: scene.objects?.length ? scene.objects : undefined,
    music_emotion: scene.music_emotion ?? undefined,
    shoppable_score: scene.shoppable_score,
  }
  // Drop undefined keys for cleaner display
  Object.keys(raw).forEach((k) => raw[k] === undefined && delete raw[k])
  return raw
}

// A scene is "meaningful" once any upstream analysis field has data. Production slates
// (color bars, leaders, black frames) usually have all of these empty, and we use this
// signal to keep panels blank during those moments.
const isSceneMeaningful = (scene: DhyhScene) =>
  Boolean(
    scene.iab_taxonomy?.length ||
      scene.objects?.length ||
      scene.garm_category?.length ||
      scene.sentiment_analysis ||
      scene.locations?.length ||
      scene.faces?.length ||
      scene.music_emotion ||
      scene.labels?.length ||
      scene.logos?.length
  )

// ---------- Source → spliced-clip time remapping -----------------------------------
// The shipped video is a concat of two source ranges (Segment A + Segment B). This
// helper maps a scene's source-time window onto the spliced clip timeline, or
// returns null if the scene doesn't intersect either segment and should be dropped.
type ClipRange = { start: number; end: number }

const remapSceneToClipTime = (sourceStart: number, sourceEnd: number): ClipRange | null => {
  // Segment A: source [SEG_A_START, SEG_A_END] → clip [0, SEG_A_DURATION]
  if (sourceEnd > DHYH_SEGMENT_A_SOURCE_START && sourceStart < DHYH_SEGMENT_A_SOURCE_END) {
    const start = Math.max(0, sourceStart - DHYH_SEGMENT_A_SOURCE_START)
    const end = Math.min(DHYH_SEGMENT_A_DURATION, sourceEnd - DHYH_SEGMENT_A_SOURCE_START)
    return { start, end }
  }
  // Segment B: source [SEG_B_START, SEG_B_END] → clip [SEG_A_DURATION, CLIP_DURATION]
  if (sourceEnd > DHYH_SEGMENT_B_SOURCE_START && sourceStart < DHYH_SEGMENT_B_SOURCE_END) {
    const start = Math.max(
      DHYH_SEGMENT_A_DURATION,
      DHYH_SEGMENT_A_DURATION + (sourceStart - DHYH_SEGMENT_B_SOURCE_START)
    )
    const end = Math.min(
      DHYH_CLIP_DURATION_SECONDS,
      DHYH_SEGMENT_A_DURATION + (sourceEnd - DHYH_SEGMENT_B_SOURCE_START)
    )
    return { start, end }
  }
  return null
}

const buildScene = (
  scene: DhyhScene,
  index: number,
  tier: TierOption,
  clipRange: ClipRange
): SceneMetadata => {
  const sentimentRaw = Array.isArray(scene.sentiment_analysis)
    ? scene.sentiment_analysis[0]
    : scene.sentiment_analysis
  const music = firstMusicEmotion(scene.music_emotion)
  const iabConsidered =
    (scene.iab_taxonomy ?? [])
      .slice(0, 3)
      .map((item) => item.name)
      .join(', ') || sentimentRaw?.name || 'Unknown'

  const meaningful = isSceneMeaningful(scene)
  const taxonomyData = buildTaxonomyData(scene)

  return {
    id: `dhyh-scene-${scene.scene}`,
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
    products: buildProducts(scene, TIER_HAS_PRODUCTS[tier] ?? false),
    taxonomyData,
    rawJson: meaningful ? buildRawJsonForScene(scene) : undefined,
    isEmpty: !meaningful,
  }
}

// Taxonomy options that are *content-wide* by nature – the classification is
// stable across the whole clip even when the upstream analysis only emits a
// value on some scenes. For these we bidirectionally fill gaps in
// `scene.taxonomyData` from the nearest neighbor so the panel never goes blank
// while valid data exists somewhere else in the clip. This fixes the common
// case where, e.g., IAB is first emitted at scene 8 but the show is obviously
// "Home Improvement" from scene 1 – the panel should reflect that continuity.
//
// Scenes marked `isEmpty` (production slates, color bars) are skipped – they
// intentionally show nothing regardless of taxonomy.
const GAP_FILL_TAXONOMIES: TaxonomyOption[] = [
  'IAB',
  'Sentiment',
  'Brand Safety',
  'Emotion',
  'Location',
  'Faces',
  'Object',
]

const fillTaxonomyGaps = (scenes: SceneMetadata[]): void => {
  for (const tax of GAP_FILL_TAXONOMIES) {
    // Forward-fill: carry the most recent value forward into any gap.
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
    // Back-fill: for scenes before the first occurrence, copy the nearest
    // future value backward so the opening doesn't render blank.
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

const buildBundle = (payload: DhyhPayload, tier: TierOption): DhyhSceneBundle => {
  // Each source scene is either dropped (not inside either segment) or remapped onto
  // the spliced clip timeline. After remapping we sort by clip start so Segment A
  // scenes precede Segment B scenes and both sections advance monotonically as the
  // video plays through the splice.
  const remapped = payload.Scenes.map((scene) => ({
    scene,
    range: remapSceneToClipTime(scene.startTime, scene.endTime),
  })).filter(
    (entry): entry is { scene: DhyhScene; range: ClipRange } => entry.range !== null
  )
  remapped.sort((a, b) => a.range.start - b.range.start)
  const scenes = remapped.map(({ scene, range }, index) => buildScene(scene, index, tier, range))
  fillTaxonomyGaps(scenes)
  return {
    tier,
    duration: DHYH_CLIP_DURATION_SECONDS,
    scenes,
    hasProductData: TIER_HAS_PRODUCTS[tier] ?? false,
  }
}
