import {
  DHYH_CLIP_DURATION_SECONDS,
  DHYH_CLIP_END_SECONDS,
  DHYH_CLIP_START_SECONDS,
  PRODUCT_PLACEHOLDER_IMAGE,
} from './constants'
import type {
  SceneMetadata,
  SceneProduct,
  TaxonomyOption,
  TaxonomySceneData,
  TierOption,
} from './types'

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
      const mod = await import('../assets/data/dhyh-tier3.json')
      return (mod.default ?? mod) as unknown as DhyhPayload
    }
    case 'Advanced Scene': {
      const mod = await import('../assets/data/dhyh-tier2.json')
      return (mod.default ?? mod) as unknown as DhyhPayload
    }
    case 'Basic Scene':
    case 'Assets Summary':
    default: {
      const mod = await import('../assets/data/dhyh-tier1.json')
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

const buildScene = (scene: DhyhScene, index: number, tier: TierOption): SceneMetadata => {
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

  // DHYH scene times are clipped to the configured demo window (18:00 – 25:00) and
  // translated to clip-relative seconds (0 – 420) so they line up with the scrubber.
  const clippedStart = Math.max(0, scene.startTime - DHYH_CLIP_START_SECONDS)
  const clippedEnd = Math.min(
    DHYH_CLIP_DURATION_SECONDS,
    scene.endTime - DHYH_CLIP_START_SECONDS
  )

  return {
    id: `dhyh-scene-${scene.scene}`,
    start: clippedStart,
    end: clippedEnd,
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

const buildBundle = (payload: DhyhPayload, tier: TierOption): DhyhSceneBundle => {
  // Only carry the scenes that intersect the demo clip window into the bundle, and
  // reindex them so the user-facing labels read "Scene 1 .. N" starting at the clip.
  const clippedScenes = payload.Scenes.filter(
    (scene) => scene.endTime > DHYH_CLIP_START_SECONDS && scene.startTime < DHYH_CLIP_END_SECONDS
  )
  const scenes = clippedScenes.map((scene, index) => buildScene(scene, index, tier))
  return {
    tier,
    duration: DHYH_CLIP_DURATION_SECONDS,
    scenes,
    hasProductData: TIER_HAS_PRODUCTS[tier] ?? false,
  }
}
